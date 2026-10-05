import Link from "next/link";
import { ArrowLeft, CalendarClock, Download, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { invoices } from "@/lib/data";
import { invoiceForBackend, selectedStudentForRequest } from "@/lib/backend";
import PaymentReceiptDialog from "@/components/PaymentReceiptDialog";

export function generateStaticParams() {
  return invoices.map(({ slug }) => ({ slug }));
}

export default async function PaymentDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const { child, studentId } = await selectedStudentForRequest(query);
  const fallbackInvoice = invoices.find((item) => item.slug === slug);
  const invoice = await invoiceForBackend(slug, child.id, fallbackInvoice);
  if (!invoice) notFound();
  const unpaid = !invoice.status.startsWith("Lunas") && !invoice.paymentSubmitted;
  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={studentId ? `/dashboard/payments?student_id=${encodeURIComponent(studentId)}` : `/dashboard/payments?child=${child.id}`}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="invoice-card panel">
        <header><div><p className="eyebrow">TAGIHAN SPP</p><h1>{invoice.month}</h1><p>{child.name} · {child.className}</p></div><span className={`status-badge ${invoice.statusTone}`}>{invoice.status}</span></header>
        <div className="invoice-total"><small>Total tagihan</small><strong>{invoice.amount}</strong></div>
        <dl className="invoice-details"><div><dt>Jatuh tempo</dt><dd><CalendarClock /> {invoice.dueDate}</dd></div><div><dt>Metode pembayaran</dt><dd>{invoice.method}</dd></div><div><dt>Dibayarkan pada</dt><dd>{invoice.paidAt}</dd></div><div><dt>Diverifikasi pada</dt><dd>{invoice.verifiedAt || "—"}</dd></div><div><dt>Status Pembayaran</dt><dd>{invoice.status}</dd></div></dl>
        {unpaid ? <PaymentReceiptDialog child={child} invoices={[invoice]} triggerLabel="Lanjutkan pembayaran" /> : invoice.proofUrl ? <a className="outline-button full-button" href={invoice.proofUrl} target="_blank" rel="noreferrer" download><Download /> Unduh bukti pembayaran</a> : <button className="outline-button full-button" type="button" disabled><Download /> Bukti pembayaran belum tersedia</button>}
      </section>
      <section className="privacy-card panel"><ShieldCheck /><div><h2>Transaksi terlindungi</h2><p>Data pembayaran hanya dapat dilihat oleh wali terdaftar dan administrator sekolah yang berwenang.</p></div></section>
    </article>
  );
}
