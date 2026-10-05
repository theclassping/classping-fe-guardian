import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { invoicesFor } from "@/lib/data";
import { invoicesForBackend, selectedStudentForRequest } from "@/lib/backend";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const { child, studentId } = await selectedStudentForRequest(query);
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id), studentId ? Number(studentId) : undefined);
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.nickname || child.firstName}.`} />
      <PaymentList items={invoices} childId={child.id} studentId={studentId} />
    </div>
  );
}
