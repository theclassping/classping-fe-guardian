import { invoicesFor } from "@/lib/data";
import { invoicesForBackend, paymentGatewayForStudent, selectedStudentForRequest } from "@/lib/backend";
import { parseInvoiceIds } from "@/lib/gateway";
import GatewayCheckout from "@/components/GatewayCheckout";
import PaymentLookupNotice from "@/components/PaymentLookupNotice";

export default async function GatewayCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { child, studentId } = await selectedStudentForRequest();
  const childQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${child.id}`;
  const listHref = `/dashboard/payments${childQuery}`;
  const ids = parseInvoiceIds(params.invoices);
  const gateway = await paymentGatewayForStudent(studentId ? Number(studentId) : undefined);
  if (!gateway.enabled) {
    return <PaymentLookupNotice emoji="🔒" title="Pembayaran online belum tersedia" copy="Sekolah belum mengaktifkan pembayaran online. Anda tetap dapat membayar dengan transfer dan mengunggah bukti pembayaran." listHref={listHref} />;
  }
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id), studentId ? Number(studentId) : undefined);
  if (!invoices) {
    return <PaymentLookupNotice emoji="⏳" title="Tagihan belum dapat dimuat" copy="Koneksi ke server sekolah sedang terganggu. Silakan coba lagi beberapa saat." listHref={listHref} retryHref={`/dashboard/payments/checkout?${new URLSearchParams({ ...(studentId ? { student_id: studentId } : {}), invoices: ids.join(",") })}`} />;
  }
  const selected = invoices.filter((invoice) => ids.includes(invoice.slug));
  if (!selected.length) {
    return <PaymentLookupNotice emoji="🧾" title="Belum ada tagihan yang dipilih" copy="Pilih satu atau beberapa tagihan dari daftar untuk dibayar online." listHref={listHref} />;
  }
  return <GatewayCheckout child={child} invoices={selected} listHref={listHref} childQuery={childQuery} />;
}
