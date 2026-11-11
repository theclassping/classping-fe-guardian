import { NextRequest, NextResponse } from "next/server";
import { decodeIdentity, linkedStudentIds } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { SESSION_COOKIES, sessionCookieOptions } from "@/lib/session";

/** Switches the child the dashboard shows, limited to the guardian's own students. */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(SESSION_COOKIES.accessToken)?.value;
  const identity = decodeIdentity(request.cookies.get(SESSION_COOKIES.identity)?.value);
  if (!identity) return errorResponse("Sesi tidak valid. Silakan masuk kembali.", 403);

  const body = (await request.json().catch(() => ({}))) as { student_id?: number | string };
  const studentId = Number(body.student_id);
  if (!accessToken || !Number.isInteger(studentId) || !linkedStudentIds(identity).has(studentId)) {
    return errorResponse("Siswa tidak terhubung dengan akun ini.", 403);
  }

  const response = NextResponse.json({ success: true, current_student_id: studentId });
  response.cookies.set(SESSION_COOKIES.currentStudentId, String(studentId), sessionCookieOptions());
  return response;
}
