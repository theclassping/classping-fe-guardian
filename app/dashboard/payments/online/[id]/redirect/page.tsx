import { paymentGatewayForStudent, selectedStudentForRequest } from "@/features/family/api";
import GatewayRedirect from "@/features/payments/components/GatewayRedirect";
import PaymentLookupNotice from "@/features/payments/components/PaymentLookupNotice";

/** Hand-over to the provider's billing page (Rintisan card form, Tokopedia, Blibli) for one online checkout. */
export default async function GatewayRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { numericStudentId, childQuery } = await selectedStudentForRequest();
  const listHref = `/dashboard/payments${childQuery}`;
  const gateway = await paymentGatewayForStudent(numericStudentId);
  if (!gateway.enabled) {
    return <PaymentLookupNotice emoji="🔒" title="Pembayaran online belum tersedia" copy="Sekolah belum mengaktifkan pembayaran online." listHref={listHref} />;
  }
  return <GatewayRedirect paymentId={id} listHref={listHref} childQuery={childQuery} />;
}
