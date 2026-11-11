import { NextResponse } from "next/server";
import { notificationsForBackend } from "@/features/notifications/api";
import { sessionStudentId } from "@/features/family/api";

export async function GET() {
  const studentId = await sessionStudentId();
  const notifications = await notificationsForBackend(studentId);
  return NextResponse.json(notifications, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
