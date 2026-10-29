import { NextRequest, NextResponse } from "next/server";

/** Read per call so test and deployment environments can set it after module load. */
const apiBaseUrl = () => process.env.DJANGO_API_URL?.replace(/\/$/, "");
/** Refresh the access token when it expires within this window, so a page render never starts with a token that dies mid-request. */
const REFRESH_LEEWAY_SECONDS = 60;
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24;

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function hasLinkedStudent(identityCookie?: string) {
  if (!identityCookie) return false;

  try {
    const identity = JSON.parse(decodeBase64Url(identityCookie)) as {
      role?: string;
      student_id?: number | string;
      students?: { id?: number | string }[];
    };

    if (identity.role !== "PARENT" && identity.role !== "ADMIN") return false;
    return Number(identity.student_id) > 0 || Boolean(identity.students?.some((student) => Number(student.id) > 0));
  } catch {
    return false;
  }
}

/** Reads the `exp` claim of a JWT without verifying it; the backend remains the authority. Returns undefined for anything unreadable. */
export function accessTokenExpiry(token?: string): number | undefined {
  if (!token) return undefined;
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1] || "")) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

function accessTokenNeedsRefresh(token?: string, now = Date.now() / 1000) {
  if (!token) return true;
  const expiry = accessTokenExpiry(token);
  return expiry !== undefined && expiry - now <= REFRESH_LEEWAY_SECONDS;
}

type RenewedTokens = { access: string; refresh?: string };
type RefreshOutcome = RenewedTokens | "expired" | "unavailable";

async function refreshAccessToken(refreshToken: string): Promise<RefreshOutcome> {
  const apiBase = apiBaseUrl();
  if (!apiBase) return "unavailable";
  try {
    const response = await fetch(`${apiBase}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });
    if (response.status === 400 || response.status === 401) return "expired";
    if (!response.ok) return "unavailable";
    const tokens = (await response.json()) as { access?: unknown; refresh?: unknown };
    if (typeof tokens.access !== "string" || !tokens.access) return "unavailable";
    return { access: tokens.access, refresh: typeof tokens.refresh === "string" ? tokens.refresh : undefined };
  } catch {
    return "unavailable";
  }
}

function hasValidSession(accessToken?: string, identityCookie?: string) {
  return Boolean(
      accessToken && hasLinkedStudent(identityCookie),
  );
}

function clearSession(response: NextResponse) {
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("guardian_identity");
  response.cookies.delete("current_student_id");
  return response;
}

function redirectToLogin(request: NextRequest, next: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);
  return clearSession(NextResponse.redirect(loginUrl));
}

function withRenewedCookies(response: NextResponse, renewed?: RenewedTokens) {
  if (!renewed) return response;
  const attributes = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: ACCESS_COOKIE_MAX_AGE };
  response.cookies.set({ name: "access_token", value: renewed.access, ...attributes });
  if (renewed.refresh) response.cookies.set({ name: "refresh_token", value: renewed.refresh, ...attributes });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const identity = request.cookies.get("guardian_identity")?.value;
  const protectedPath = pathname.startsWith("/dashboard") || pathname === "/activities";
  let renewed: RenewedTokens | undefined;

  // Renew an expired (or missing) access token before the page renders, instead of letting every backend read fail silently.
  if (protectedPath && refreshToken && hasLinkedStudent(identity) && accessTokenNeedsRefresh(accessToken)) {
    const outcome = await refreshAccessToken(refreshToken);
    if (outcome === "expired") return redirectToLogin(request, `${pathname}${request.nextUrl.search}`);
    if (outcome !== "unavailable") {
      renewed = outcome;
      accessToken = outcome.access;
      // Update the incoming cookie header too, so this request's server components already read the new token.
      request.cookies.set("access_token", outcome.access);
      if (outcome.refresh) request.cookies.set("refresh_token", outcome.refresh);
    }
  }

  const validSession = hasValidSession(accessToken, identity);

  if (pathname === "/login" && validSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname === "/activities") {
    if (!validSession) return redirectToLogin(request, `${pathname}${request.nextUrl.search}`);
    const target = new URL(`/dashboard/activities${request.nextUrl.search}`, request.url);
    return withRenewedCookies(NextResponse.rewrite(target, { request: { headers: request.headers } }), renewed);
  }

  if (pathname.startsWith("/dashboard") && !validSession) {
    return redirectToLogin(request, `${pathname}${request.nextUrl.search}`);
  }

  if (pathname === "/login" && (accessToken || identity)) {
    return clearSession(NextResponse.next());
  }

  return withRenewedCookies(NextResponse.next({ request: { headers: request.headers } }), renewed);
}

export const config = {
  matcher: ["/login", "/activities", "/dashboard/:path*"],
};
