import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { getChild, invoicesFor } from "@/lib/data";
import { invoicesForBackend, sessionStudentId, studentForBackend } from "@/lib/backend";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const fallback = getChild(query.child);
  const studentId = await sessionStudentId(query.student_id);
  const child = studentId ? await studentForBackend(studentId, fallback) : fallback;
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id), studentId);
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.nickname || child.firstName}.`} />
      <PaymentList items={invoices} child={child} childId={child.id} studentId={studentId ? String(studentId) : undefined} />
    </div>
  );
}
