import { CheckCircle2, Download } from "lucide-react";
import type { PaymentReceipt } from "@/lib/receipt";
import PaymentProofDownload from "@/components/PaymentProofDownload";

export default function PaymentReceiptCard({ receipt, invoiceId, hasUploadedProof }: { receipt: PaymentReceipt; invoiceId: string; hasUploadedProof: boolean }) {
  const rows: Array<[string, string]> = [
    ["Nomor tagihan", receipt.reference],
    ["Siswa", receipt.student],
    ["Diverifikasi pada", receipt.verifiedAt],
    ["Total pembayaran", receipt.amount],
  ];
  return (
    <section className="payment-receipt" aria-labelledby="payment-receipt-title">
      <div className="payment-receipt-head">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <p className="eyebrow">PEMBAYARAN BERHASIL</p>
          <h2 id="payment-receipt-title">Pembayaran telah diverifikasi</h2>
          <p>Pembayaran telah diterima dan dicatat sebagai pembayaran yang telah selesai.</p>
        </div>
      </div>
      <dl className="payment-receipt-rows">
        {rows.map(([label, value]) => (
          <div key={label} className={label === "Total pembayaran" ? "is-total" : undefined}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <a className="primary-button full-button" href={receipt.downloadHref} download>
        <Download aria-hidden="true" /> Unduh bukti verifikasi (PDF)
      </a>
      {hasUploadedProof && <PaymentProofDownload invoiceId={invoiceId} variant="link" />}
      <p className="payment-receipt-note">Tidak ada tindakan lebih lanjut yang diperlukan. Simpan bukti ini sebagai konfirmasi pembayaran.</p>
    </section>
  );
}
