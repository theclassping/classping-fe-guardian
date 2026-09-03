import { CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import PaymentReceiptDialog from "@/components/PaymentReceiptDialog";
import { getChild, invoicesFor } from "@/lib/data";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const query = await searchParams;
  const child = getChild(query.child);
  const invoices = invoicesFor(child.id);
  const openAmount = invoices.reduce((total, invoice) => total + Math.max(0, invoice.billAmount - invoice.paidAmount), 0);
  const paidCount = invoices.filter((invoice) => invoice.paidAmount >= invoice.billAmount).length;
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.firstName}.`} action={<PaymentReceiptDialog child={child} invoices={invoices} />} />
      <section className="summary-grid payment-summary-grid">
        <article className="summary-card panel"><span className="summary-icon orange"><Clock3 /></span><div><small>Perlu dibayar</small><strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(openAmount)}</strong><p>Jatuh tempo 10 Sep</p></div></article>
        <article className="summary-card panel"><span className="summary-icon green"><CheckCircle2 /></span><div><small>Total lunas</small><strong>{paidCount} bulan</strong><p>Tahun ajaran 2026/2027</p></div></article>
        <article className="summary-card panel"><span className="summary-icon blue"><ReceiptText /></span><div><small>Denda dibayar</small><strong>Rp 15.000</strong><p>Tahun ajaran ini</p></div></article>
      </section>
      <PaymentList items={invoices} childId={child.id} />
    </div>
  );
}
