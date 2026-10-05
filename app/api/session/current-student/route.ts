import { NextRequest, NextResponse } from "next/server";
import { decodeIdentity } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const identity = decodeIdentity(request.cookies.get("guardian_identity")?.value);
  const body = (await request.json().catch(() => ({}))) as { student_id?: number | string };
  const studentId = Number(body.student_id);
  const linkedIds = new Set([
    ...(identity.student_id ? [identity.student_id] : []),
    ...(identity.students || []).map((student) => student.id),
  ]);

  if (
    !accessToken ||
    accessToken.startsWith("classping-guardian-demo") ||
    !Number.isInteger(studentId) ||
    !linkedIds.has(studentId)
  ) {
    return NextResponse.json({ detail: "Siswa tidak terhubung dengan akun ini." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, current_student_id: studentId });
  response.cookies.set("current_student_id", String(studentId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
