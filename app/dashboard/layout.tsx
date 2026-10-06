import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GuardianShell from "@/components/layout/GuardianShell";
import { decodeIdentity } from "@/lib/auth";
import { notificationsForBackend, schoolForBackend, sessionStudentId, studentForBackend } from "@/lib/backend";
import { getChild } from "@/lib/data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const identity = decodeIdentity(cookieStore.get("guardian_identity")?.value);
  if (!identity || (!identity.student_id && !identity.students?.length)) {
    redirect("/login");
  }
  const currentStudentId = await sessionStudentId();
  const [currentChild, school, notifications] = currentStudentId
    ? await Promise.all([studentForBackend(currentStudentId, getChild()), schoolForBackend(currentStudentId), notificationsForBackend(currentStudentId)])
    : [undefined, null, []];
  return <GuardianShell identity={identity} currentStudentId={currentStudentId} currentChild={currentChild} school={school} notifications={notifications}>{children}</GuardianShell>;
}
