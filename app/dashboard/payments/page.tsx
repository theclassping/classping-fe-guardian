import Link from "next/link";
import { RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { invoicesFor } from "@/lib/data";
import { invoicesForBackend, paymentGatewayForStudent, selectedStudentForRequest } from "@/lib/backend";
import GatewayPaymentHistory from "@/components/GatewayPaymentHistory";

export default async function PaymentsPage() {
  const { child, studentId } = await selectedStudentForRequest();
  const numericStudentId = studentId ? Number(studentId) : undefined;
  const [invoices, gateway] = await Promise.all([
    invoicesForBackend(child.id, invoicesFor(child.id), numericStudentId),
    paymentGatewayForStudent(numericStudentId),
  ]);
  const childQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${child.id}`;
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.nickname || child.firstName}.`} />
      {invoices ? (
        <>
          <PaymentList items={invoices} childId={child.id} studentId={studentId} gatewayEnabled={gateway.enabled} />
          {gateway.enabled && <GatewayPaymentHistory studentId={studentId} childQuery={childQuery} />}
        </>
      ) : (
        <section className="empty-state panel" role="status">
          <span aria-hidden="true">⏳</span>
          <h2>Tagihan belum dapat dimuat</h2>
          <p>Koneksi ke server sekolah sedang terganggu. Tagihan Anda tetap tersimpan; silakan muat ulang halaman beberapa saat lagi.</p>
          <div className="payment-lookup-actions"><Link className="outline-button" href={studentId ? `/dashboard/payments?student_id=${encodeURIComponent(studentId)}` : "/dashboard/payments"}><RefreshCw /> Coba lagi</Link></div>
        </section>
      )}
    </div>
  );
}
