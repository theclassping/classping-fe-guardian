import Link from "next/link";
import { ArrowLeft, CalendarClock, CircleDollarSign, Download, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { child, invoices } from "@/lib/data";

export function generateStaticParams() {
  return invoices.map(({ slug }) => ({ slug }));
}

export default async function PaymentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const invoice = invoices.find((item) => item.slug === slug);
  if (!invoice) notFound();
  const unpaid = !invoice.status.startsWith("Lunas");
  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href="/dashboard/payments"><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="invoice-card panel">
        <header><div><p className="eyebrow">TAGIHAN SPP</p><h1>{invoice.month}</h1><p>{child.name} · {child.className}</p></div><span className={`status-badge ${invoice.statusTone}`}>{invoice.status}</span></header>
        <div className="invoice-total"><small>Total tagihan</small><strong>{invoice.amount}</strong></div>
        <dl className="invoice-details"><div><dt>Jatuh tempo</dt><dd><CalendarClock /> {invoice.dueDate}</dd></div><div><dt>Metode pembayaran</dt><dd>{invoice.method}</dd></div><div><dt>Tanggal dibayar</dt><dd>{invoice.paidAt}</dd></div><div><dt>Denda</dt><dd>{invoice.fine}</dd></div></dl>
        {unpaid ? <button className="primary-button full-button" type="button"><CircleDollarSign /> Lanjutkan pembayaran</button> : <button className="outline-button full-button" type="button"><Download /> Unduh bukti pembayaran</button>}
      </section>
      <section className="privacy-card panel"><ShieldCheck /><div><h2>Transaksi terlindungi</h2><p>Data pembayaran hanya dapat dilihat oleh wali terdaftar dan administrator sekolah yang berwenang.</p></div></section>
    </article>
  );
}
