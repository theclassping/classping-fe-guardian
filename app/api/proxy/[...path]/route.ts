import { NextRequest } from "next/server";
import { backendOrigin } from "@/lib/env";
import { authorizeGuardianMutation } from "@/features/family/guardian-access";
import { errorResponse, relayResponse } from "@/lib/http";
import { SESSION_COOKIES } from "@/lib/session";

/** Forwards /api/proxy/<path> from the browser to the Django API with the session's access token. */
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiBase = backendOrigin();
  if (!apiBase) return errorResponse("Server API belum dikonfigurasi.", 503);

  const accessToken = request.cookies.get(SESSION_COOKIES.accessToken)?.value;
  if (!accessToken) return errorResponse("Authentication credentials were not provided.", 401);

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

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
