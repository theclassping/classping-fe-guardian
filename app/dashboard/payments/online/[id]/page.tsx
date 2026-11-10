import { paymentGatewayForStudent, selectedStudentForRequest } from "@/lib/backend";
import GatewayPaymentStatus from "@/components/GatewayPaymentStatus";
import PaymentLookupNotice from "@/components/PaymentLookupNotice";

export default async function GatewayPaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { numericStudentId, childQuery } = await selectedStudentForRequest();
  const listHref = `/dashboard/payments${childQuery}`;
  const gateway = await paymentGatewayForStudent(numericStudentId);
  if (!gateway.enabled) {
    return <PaymentLookupNotice emoji="🔒" title="Pembayaran online belum tersedia" copy="Sekolah belum mengaktifkan pembayaran online." listHref={listHref} />;
  }
  return <GatewayPaymentStatus paymentId={id} listHref={listHref} childQuery={childQuery} returned={query.returned === "1"} />;
}
