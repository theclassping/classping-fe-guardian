import { paymentGatewayForStudent, selectedStudentForRequest } from "@/lib/backend";
import GatewayPaymentStatus from "@/components/GatewayPaymentStatus";
import PaymentLookupNotice from "@/components/PaymentLookupNotice";

export default async function GatewayPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { child, studentId } = await selectedStudentForRequest();
  const childQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${child.id}`;
  const listHref = `/dashboard/payments${childQuery}`;
  const gateway = await paymentGatewayForStudent(studentId ? Number(studentId) : undefined);
  if (!gateway.enabled) {
    return <PaymentLookupNotice emoji="🔒" title="Pembayaran online belum tersedia" copy="Sekolah belum mengaktifkan pembayaran online." listHref={listHref} />;
  }
  return <GatewayPaymentStatus paymentId={id} listHref={listHref} childQuery={childQuery} />;
}
