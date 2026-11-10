import { NextRequest } from "next/server";
import { backendOrigin } from "@/lib/env";
import { authorizeGuardianMutation } from "@/features/family/guardian-access";
import { errorResponse, relayResponse } from "@/lib/http";
import { SESSION_COOKIES } from "@/lib/session";

/**
 * Browser request headers the backend reads, passed through unchanged. Everything else (cookies, the
 * browser's own Authorization, host headers) stays behind; the session's token is added instead.
 * Idempotency-Key: POST gateway/checkout/ rejects a checkout without it, so a retried click can't pay twice.
 */
const FORWARDED_HEADERS = ["Content-Type", "Idempotency-Key"];

/** Forwards /api/proxy/<path> from the browser to the Django API with the session's access token. */
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiBase = backendOrigin();
  if (!apiBase) return errorResponse("Server API belum dikonfigurasi.", 503);

  const accessToken = request.cookies.get(SESSION_COOKIES.accessToken)?.value;
  if (!accessToken) return errorResponse("Authentication credentials were not provided.", 401);

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const rejection = await authorizeGuardianMutation(request, path, apiBase, accessToken);
    if (rejection) return rejection;
    const response = await fetch(`${apiBase}/api/${path.join("/")}/${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    return relayResponse(response);
  } catch {
    return errorResponse("Tidak dapat menghubungi server API.", 502);
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
