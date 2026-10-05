import { NextRequest, NextResponse } from "next/server";

function hasLinkedStudent(identityCookie?: string) {
  if (!identityCookie) return false;

  try {
    const base64 = identityCookie.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const identity = JSON.parse(new TextDecoder().decode(bytes)) as {
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

function hasValidSession(accessToken?: string, identityCookie?: string) {
  return Boolean(
    accessToken &&
      !accessToken.startsWith("classping-guardian-demo") &&
      hasLinkedStudent(identityCookie),
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const identity = request.cookies.get("guardian_identity")?.value;
  const validSession = hasValidSession(accessToken, identity);

  if (pathname === "/login" && validSession) {
    return NextResponse.redirect(new URL("/activities", request.url));
  }

  if (pathname === "/activities") {
    if (!validSession) return redirectToLogin(request, `${pathname}${request.nextUrl.search}`);
    const target = new URL(`/dashboard/activities${request.nextUrl.search}`, request.url);
    return NextResponse.rewrite(target);
  }

  if (pathname.startsWith("/dashboard") && !validSession) {
    return redirectToLogin(request, `${pathname}${request.nextUrl.search}`);
  }

  if (pathname === "/login" && (accessToken || identity)) {
    return clearSession(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/activities", "/dashboard/:path*"],
};
