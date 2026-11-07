import { cookies } from "next/headers";
import DashboardView from "@/components/DashboardView";
import { decodeIdentity } from "@/lib/auth";
import { activitiesFor, invoicesFor } from "@/lib/data";
import { activitiesForBackend, guardianForBackend, invoicesForBackend, paymentGatewayForStudent, selectedStudentForRequest } from "@/lib/backend";

export default async function GuardianDashboard() {
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  const { child, studentId } = await selectedStudentForRequest();
  const numericStudentId = studentId ? Number(studentId) : undefined;
  const [activities, invoices, guardian, gateway] = await Promise.all([
    activitiesForBackend(child.id, activitiesFor(child.id), numericStudentId),
    invoicesForBackend(child.id, invoicesFor(child.id), numericStudentId),
    identity ? guardianForBackend(identity.guardian_id, identity.id, identity.email) : Promise.resolve(null),
    paymentGatewayForStudent(numericStudentId),
  ]);
  const guardianName = guardian?.name?.trim() || identity?.name?.trim() || "Bapak/Ibu Wali";
  const childQuery = studentId ? `?student_id=${studentId}` : `?child=${child.id}`;
  return <DashboardView guardianName={guardianName} child={child} childQuery={childQuery} invoices={invoices} activities={activities} gatewayEnabled={gateway.enabled} />;
}
