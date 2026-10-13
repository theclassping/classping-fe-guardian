import Link from "next/link";
import { ArrowLeft, CalendarClock, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { invoices } from "@/lib/data";
import { invoiceForBackend, selectedStudentForRequest } from "@/lib/backend";
import PaymentReceiptDialog from "@/components/PaymentReceiptDialog";
import PaymentProofDownload from "@/components/PaymentProofDownload";
import PaymentVerificationStatus from "@/components/PaymentVerificationStatus";
import { invoicePaymentState } from "@/lib/payments";

export function generateStaticParams() {
  return invoices.map(({ slug }) => ({ slug }));
}

export default async function PaymentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { child, studentId } = await selectedStudentForRequest();
  const fallbackInvoice = invoices.find((item) => item.slug === slug);
  const invoice = await invoiceForBackend(slug, child.id, fallbackInvoice);
  if (!invoice) notFound();
  const paymentState = invoicePaymentState(invoice);
  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={studentId ? `/dashboard/payments?student_id=${encodeURIComponent(studentId)}` : `/dashboard/payments?child=${child.id}`}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="invoice-card panel">
        <header><div><p className="eyebrow">TAGIHAN {invoice.feeType}</p><h1>{invoice.month}</h1><p>{child.name} · {child.className}</p></div><span className={`status-badge ${invoice.statusTone}`}>{invoice.status}</span></header>
        <div className="invoice-total"><small>Total tagihan</small><strong>{invoice.amount}</strong></div>
        <dl className="invoice-details"><div><dt>Jatuh tempo</dt><dd><CalendarClock /> {invoice.dueDate}</dd></div><div><dt>Metode pembayaran</dt><dd>—</dd></div><div><dt>Dibayarkan pada</dt><dd>{invoice.paidAt}</dd></div><div><dt>Diverifikasi pada</dt><dd>{invoice.verifiedAt || "—"}</dd></div><div><dt>Status Pembayaran</dt><dd>{invoice.status}</dd></div></dl>
        {invoice.rejectionReason && (
          <div className="payment-rejection-message" role="alert">
            <p><strong>Pembayaran ditolak.</strong></p>
            <p><strong>Alasan:</strong> {invoice.rejectionReason}</p>
            <p>Silakan unggah bukti pembayaran baru atau hubungi staf sekolah.</p>
          </div>
        )}
        {paymentState === "unpaid" ? (
          <PaymentReceiptDialog child={child} invoices={[invoice]} triggerLabel={invoice.rejectionReason ? "Unggah bukti pembayaran baru" : "Lanjutkan pembayaran"} />
        ) : paymentState === "submitted" ? (
          <PaymentVerificationStatus />
        ) : invoice.proofUrl ? (
          <PaymentProofDownload invoiceId={invoice.slug} />
        ) : (
          <p className="form-message" role="status">Bukti pembayaran belum tersedia</p>
        )}
      </section>
      <section className="privacy-card panel"><ShieldCheck /><div><h2>Transaksi terlindungi</h2><p>Data pembayaran hanya dapat dilihat oleh wali terdaftar dan administrator sekolah yang berwenang.</p></div></section>
    </article>
  );
}
