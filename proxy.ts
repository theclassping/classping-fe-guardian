import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const identity = request.cookies.get("guardian_identity")?.value;

  if (pathname === "/login" && accessToken && identity) {
    return NextResponse.redirect(new URL("/activities", request.url));
  }

  if (pathname === "/activities") {
    if (!accessToken || !identity) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    const target = new URL(`/dashboard/activities${request.nextUrl.search}`, request.url);
    return NextResponse.rewrite(target);
  }

  if (pathname.startsWith("/dashboard") && (!accessToken || !identity)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/activities", "/dashboard/:path*"],
};
