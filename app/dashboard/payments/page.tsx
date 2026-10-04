import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { getChild, invoicesFor } from "@/lib/data";
import { invoicesForBackend, studentForBackend } from "@/lib/backend";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const fallback = getChild(query.child);
  const child = query.student_id ? await studentForBackend(Number(query.student_id), fallback) : fallback;
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id), query.student_id ? Number(query.student_id) : undefined);
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.nickname || child.firstName}.`} />
      <PaymentList items={invoices} child={child} childId={child.id} studentId={query.student_id} />
    </div>
  );
}
