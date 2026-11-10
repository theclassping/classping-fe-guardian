import { NextRequest } from "next/server";
import { postJsonToBackend } from "@/lib/http";

export async function POST(request: NextRequest) {
  return postJsonToBackend(request, "/api/auth/forgot-password/");
}
