import { NextRequest, NextResponse } from "next/server";
import { decodeIdentity, linkedStudentIds } from "@/lib/auth";
import { accessTokenClaims } from "@/lib/base64url";
import { backendUrl } from "@/lib/env";
import { clearSessionCookies, SESSION_COOKIES, sessionCookieOptions } from "@/lib/session";

/** Refresh the access token when it expires within this window, so a page render never starts with a token that dies mid-request. */
const REFRESH_LEEWAY_SECONDS = 60;
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24;

/** App API routes that call the backend with the session's access token (browser `fetch` calls, e.g. every online-payment action). */
const SESSION_API_PREFIXES = ["/api/proxy/", "/api/notifications", "/api/receipts/"];

function hasLinkedStudent(identityCookie?: string) {
  const identity = decodeIdentity(identityCookie);
  return Boolean(identity && linkedStudentIds(identity).size);
}

function accessTokenNeedsRefresh(token?: string, now = Date.now() / 1000) {
  if (!token) return true;
  const { exp } = accessTokenClaims(token);
  return exp !== undefined && exp - now <= REFRESH_LEEWAY_SECONDS;
}

type RenewedTokens = { access: string; refresh?: string };
type RefreshOutcome = RenewedTokens | "expired" | "unavailable";

async function refreshAccessToken(refreshToken: string): Promise<RefreshOutcome> {
  const url = backendUrl("/api/auth/refresh/");
  if (!url) return "unavailable";
  try {
    const response = await fetch(url, {
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

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return clearSessionCookies(NextResponse.redirect(loginUrl));
}

function sessionExpiredResponse() {
  return clearSessionCookies(NextResponse.json({ detail: "Sesi Anda telah berakhir. Silakan masuk kembali." }, { status: 401 }));
}

function withRenewedCookies(response: NextResponse, renewed?: RenewedTokens) {
  if (!renewed) return response;
  const options = sessionCookieOptions({ maxAge: ACCESS_COOKIE_MAX_AGE });
  response.cookies.set({ name: SESSION_COOKIES.accessToken, value: renewed.access, ...options });
  if (renewed.refresh) response.cookies.set({ name: SESSION_COOKIES.refreshToken, value: renewed.refresh, ...options });
  return response;
}

/** Continue to the page or route, with this request's cookie header carrying any renewed token. */
function forward(request: NextRequest, renewed?: RenewedTokens) {
  return withRenewedCookies(NextResponse.next({ request: { headers: request.headers } }), renewed);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let accessToken = request.cookies.get(SESSION_COOKIES.accessToken)?.value;
  const refreshToken = request.cookies.get(SESSION_COOKIES.refreshToken)?.value;
  const identity = request.cookies.get(SESSION_COOKIES.identity)?.value;
  const sessionApi = SESSION_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const protectedPath = pathname.startsWith("/dashboard") || pathname === "/activities" || sessionApi;
  let renewed: RenewedTokens | undefined;

  // Renew an expired (or missing) access token before the page renders or the API call is forwarded, instead of letting the backend reject it.
  if (protectedPath && refreshToken && hasLinkedStudent(identity) && accessTokenNeedsRefresh(accessToken)) {
    const outcome = await refreshAccessToken(refreshToken);
    if (outcome === "expired") return sessionApi ? sessionExpiredResponse() : redirectToLogin(request);
    if (outcome !== "unavailable") {
      renewed = outcome;
      accessToken = outcome.access;
      // Update the incoming cookie header too, so this request's server components already read the new token.
      request.cookies.set(SESSION_COOKIES.accessToken, outcome.access);
      if (outcome.refresh) request.cookies.set(SESSION_COOKIES.refreshToken, outcome.refresh);
    }
  }

  // API routes keep their own auth checks and error bodies; the proxy only hands them a fresh token.
  if (sessionApi) return forward(request, renewed);

  const validSession = Boolean(accessToken && hasLinkedStudent(identity));

  if (pathname === "/login") {
    if (validSession) return NextResponse.redirect(new URL("/dashboard", request.url));
    return accessToken || identity ? clearSessionCookies(NextResponse.next()) : NextResponse.next();
  }

  if (!validSession) return redirectToLogin(request);

  if (pathname === "/activities") {
    const target = new URL(`/dashboard/activities${request.nextUrl.search}`, request.url);
    return withRenewedCookies(NextResponse.rewrite(target, { request: { headers: request.headers } }), renewed);
  }

  return forward(request, renewed);
}

export const config = {
  matcher: ["/login", "/activities", "/dashboard/:path*", "/api/proxy/:path*", "/api/notifications", "/api/receipts/:path*"],
};
