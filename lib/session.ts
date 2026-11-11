import type { NextResponse } from "next/server";

/** The httpOnly cookies that make up a guardian session. */
export const SESSION_COOKIES = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  identity: "guardian_identity",
  currentStudentId: "current_student_id",
} as const;

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 7;

/** Attributes for session cookies; `remember` keeps them for 7 days, otherwise until the browser closes. */
export function sessionCookieOptions({ remember = false, maxAge }: { remember?: boolean; maxAge?: number } = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : remember ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  };
}

export function clearSessionCookies<T extends NextResponse>(response: T) {
  for (const name of Object.values(SESSION_COOKIES)) response.cookies.delete(name);
  return response;
}
