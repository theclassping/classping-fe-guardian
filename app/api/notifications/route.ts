import { NextResponse } from "next/server";
import { notificationsForBackend, sessionStudentId } from "@/lib/backend";

export async function GET() {
  const studentId = await sessionStudentId();
  const notifications = await notificationsForBackend(studentId);
  return NextResponse.json(notifications, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
