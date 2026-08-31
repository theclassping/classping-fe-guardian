import { CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PaymentList from "@/components/PaymentList";
import { child, invoices } from "@/lib/data";

export default function PaymentsPage() {
  return (
    <div className="content-page">
      <PageHeader eyebrow="ADMINISTRASI SEKOLAH" title="SPP & Tagihan" description={`Pantau tagihan, denda, dan riwayat pembayaran ${child.firstName}.`} />
      <section className="summary-grid payment-summary-grid">
        <article className="summary-card panel"><span className="summary-icon orange"><Clock3 /></span><div><small>Perlu dibayar</small><strong>Rp 250.000</strong><p>Jatuh tempo 10 Sep</p></div></article>
        <article className="summary-card panel"><span className="summary-icon green"><CheckCircle2 /></span><div><small>Total lunas</small><strong>3 bulan</strong><p>Juni–Agustus 2026</p></div></article>
        <article className="summary-card panel"><span className="summary-icon blue"><ReceiptText /></span><div><small>Denda dibayar</small><strong>Rp 15.000</strong><p>Tahun ajaran ini</p></div></article>
      </section>
      <PaymentList items={invoices} />
    </div>
  );
}
