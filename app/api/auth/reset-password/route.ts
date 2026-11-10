import { NextRequest } from "next/server";
import { postJsonToBackend } from "@/lib/http";
import { clearSessionCookies } from "@/lib/session";

export async function POST(request: NextRequest) {
  const response = await postJsonToBackend(request, "/api/auth/reset-password/");
  // A new password ends every existing session, including one open in this browser.
  return response.ok ? clearSessionCookies(response) : response;
}
