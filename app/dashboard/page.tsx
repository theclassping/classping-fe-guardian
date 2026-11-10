import DashboardView from "@/components/DashboardView";
import { activitiesForBackend, guardianForBackend, invoicesForBackend, paymentGatewayForStudent, selectedStudentForRequest, sessionIdentity } from "@/lib/backend";

export default async function GuardianDashboard() {
  const identity = await sessionIdentity();
  const { child, numericStudentId, childQuery } = await selectedStudentForRequest();
  const [activities, invoices, guardian, gateway] = await Promise.all([
    activitiesForBackend(child.id, numericStudentId),
    invoicesForBackend(child.id, numericStudentId),
    identity ? guardianForBackend(identity.guardian_id, identity.id, identity.email) : Promise.resolve(null),
    paymentGatewayForStudent(numericStudentId),
  ]);
  const guardianName = guardian?.name?.trim() || identity?.name?.trim() || "Bapak/Ibu Wali";
  return <DashboardView guardianName={guardianName} child={child} childQuery={childQuery} invoices={invoices} activities={activities} gatewayEnabled={gateway.enabled} />;
}
