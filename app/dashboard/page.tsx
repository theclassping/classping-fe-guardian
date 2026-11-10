import DashboardView from "@/features/dashboard/components/DashboardView";
import { activitiesForBackend } from "@/features/activities/api";
import { guardianForBackend, paymentGatewayForStudent, selectedStudentForRequest, sessionIdentity } from "@/features/family/api";
import { invoicesForBackend } from "@/features/payments/api";

export default async function GuardianDashboard() {
  const identity = await sessionIdentity();
  const { child, numericStudentId, childQuery } = await selectedStudentForRequest();
  const [activities, invoices, guardian, gateway] = await Promise.all([
    activitiesForBackend(numericStudentId),
    invoicesForBackend(numericStudentId),
    identity ? guardianForBackend(identity.guardian_id, identity.id, identity.email) : Promise.resolve(null),
    paymentGatewayForStudent(numericStudentId),
  ]);
  const guardianName = guardian?.name?.trim() || identity?.name?.trim() || "Bapak/Ibu Wali";
  return <DashboardView guardianName={guardianName} child={child} childQuery={childQuery} invoices={invoices} activities={activities} gatewayEnabled={gateway.enabled} />;
}
