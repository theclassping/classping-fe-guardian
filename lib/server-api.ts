// Server-side reads from the Django API with the signed-in guardian's access token (server components and route handlers).
import { cookies } from "next/headers";
import { backendUrl } from "@/lib/env";
import { SESSION_COOKIES } from "@/lib/session";

export type ApiResult<T> = { status: number; data: T | null; error?: string };

/**
 * GETs a backend path (e.g. "/api/students/6/") and keeps the HTTP status, so callers can tell
 * "not found" apart from "could not reach the API". Status 0: no backend or session configured, or a network failure.
 * Identical GETs within one page render are sent once (Next.js request memoization).
 */
export async function getWithStatus<T>(path: string): Promise<ApiResult<T>> {
  const url = backendUrl(path);
  const accessToken = (await cookies()).get(SESSION_COOKIES.accessToken)?.value;
  if (!url || !accessToken) return { status: 0, data: null };
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) return { status: response.status, data: null };
    return { status: response.status, data: (await response.json()) as T };
  } catch {
    return { status: 0, data: null };
  }
}

/** The response body, or `null` when the backend could not be read. */
export async function get<T>(path: string): Promise<T | null> {
  return (await getWithStatus<T>(path)).data;
}

/**
 * Sends JSON to a backend path with the session's token (POST/PATCH) and keeps the status like getWithStatus.
 * Pass `accessToken` when running outside a request, e.g. in a background task started with `after()`.
 */
export async function sendWithStatus<T>(path: string, { method = "POST", body, accessToken }: { method?: "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; accessToken?: string } = {}): Promise<ApiResult<T>> {
  const url = backendUrl(path);
  const token = accessToken ?? (await cookies()).get(SESSION_COOKIES.accessToken)?.value;
  if (!url || !token) return { status: 0, data: null };
  try {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = response.status === 204 ? null : ((await response.json().catch(() => null)) as T | null);
    return { status: response.status, data: response.ok ? data : null, ...(response.ok ? {} : { error: (data as { detail?: string } | null)?.detail }) };
  } catch {
    return { status: 0, data: null };
  }
}

/** The session's access token, for work that outlives the request. */
export async function sessionAccessToken() {
  return (await cookies()).get(SESSION_COOKIES.accessToken)?.value;
}
