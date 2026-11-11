import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/env";
import { clearSessionCookies, SESSION_COOKIES } from "@/lib/session";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIES.accessToken)?.value;
  const refreshToken = request.cookies.get(SESSION_COOKIES.refreshToken)?.value;
  const url = backendUrl("/api/auth/logout/");

  if (url && accessToken && refreshToken) {
    try {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Local cookies must still be cleared if the backend is unavailable.
    }
  }

  return clearSessionCookies(NextResponse.json({ success: true }));
}
