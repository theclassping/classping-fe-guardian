import Link from "next/link";
import { RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { invoicesFor } from "@/lib/data";
import { invoicesForBackend, selectedStudentForRequest } from "@/lib/backend";

export default async function PaymentsPage() {
  const { child, studentId } = await selectedStudentForRequest();
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id), studentId ? Number(studentId) : undefined);
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.nickname || child.firstName}.`} />
      {invoices ? (
        <PaymentList items={invoices} childId={child.id} studentId={studentId} />
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
