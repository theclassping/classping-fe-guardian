import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/env";

/** Error body in the backend's `{ "detail": "..." }` shape. */
export function errorResponse(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}

/** Passes a backend response to the browser unchanged: status, body and content type. */
export async function relayResponse(response: Response, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers(extraHeaders);
  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  return new NextResponse(await response.arrayBuffer(), { status: response.status, headers });
}

/** Forwards the request's JSON body to an unauthenticated backend endpoint (e.g. /api/auth/forgot-password/) and relays the answer. */
export async function postJsonToBackend(request: NextRequest, path: string) {
  const url = backendUrl(path);
  if (!url) return errorResponse("Server autentikasi belum dikonfigurasi.", 503);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    return relayResponse(response, { "Cache-Control": "no-store" });
  } catch {
    return errorResponse("Tidak dapat menghubungi server autentikasi.", 502);
  }
}
