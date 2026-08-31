import { NextRequest, NextResponse } from "next/server";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (apiBase && accessToken && refreshToken) {
    try {
      await fetch(`${apiBase}/api/auth/logout/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Local cookies must still be cleared if the backend is unavailable.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  response.cookies.delete("guardian_identity");
  return response;
}
