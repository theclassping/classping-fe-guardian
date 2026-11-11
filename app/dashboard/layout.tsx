import { redirect } from "next/navigation";
import GuardianShell from "@/components/layout/GuardianShell";
import { notificationsForBackend } from "@/features/notifications/api";
import { schoolForBackend, sessionIdentity, sessionStudentId, studentForBackend } from "@/features/family/api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const identity = await sessionIdentity();
  if (!identity || (!identity.student_id && !identity.students?.length)) {
    redirect("/login");
  }
  const currentStudentId = await sessionStudentId();
  const [currentChild, school, notifications] = currentStudentId
    ? await Promise.all([studentForBackend(currentStudentId), schoolForBackend(currentStudentId), notificationsForBackend(currentStudentId)])
    : [undefined, null, []];
  return <GuardianShell identity={identity} currentStudentId={currentStudentId} currentChild={currentChild} school={school} notifications={notifications}>{children}</GuardianShell>;
}
