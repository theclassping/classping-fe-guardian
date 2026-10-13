"use client";

import { FileUp, Landmark, X } from "lucide-react";
import { DragEvent, FormEvent, useMemo, useRef, useState } from "react";
import type { ChildProfile, Invoice } from "@/lib/data";
import { useRouter } from "next/navigation";
import { invoicePaymentState, submitPaymentProof } from "@/lib/payments";
import PaymentVerificationStatus from "@/components/PaymentVerificationStatus";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function PaymentReceiptDialog({ child, invoices, triggerLabel = "Bayar & unggah bukti" }: { child: ChildProfile; invoices: readonly Invoice[]; triggerLabel?: string }) {
  const router = useRouter();
  const unpaid = useMemo(() => invoices.filter((invoice) => invoicePaymentState(invoice) === "unpaid" && invoice.paidAmount < invoice.billAmount), [invoices]);
  const selected = unpaid[0];
  const receiptInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(selected?.paymentMethod || "bank_transfer");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ text: string } | null>(null);
  const remainingBefore = Math.max(0, (selected?.billAmount || 0) - (selected?.paidAmount || 0));

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!receipt?.size) return setError("Pilih bukti pembayaran terlebih dahulu.");
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(receipt.type)) return setError("Bukti harus berupa JPG, PNG, atau PDF.");
    if (receipt.size > 10 * 1024 * 1024) return setError("Ukuran bukti maksimal 10 MB.");
    const receiptAmount = remainingBefore;
    if (!selected || receiptAmount <= 0) return setError("Tidak ada tagihan yang dapat dibayar.");
    const invoiceId = Number(selected.slug);
    if (!Number.isInteger(invoiceId)) return setError("Tagihan ini belum tersedia untuk pembayaran online.");

    setSubmitting(true);
    try {
      const presignResponse = await fetch("/api/proxy/media/presign/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: receipt.name, content_type: receipt.type, expires_in: 3600 }) });
      const presign = (await presignResponse.json()) as { file_key?: string; presigned_url?: string; detail?: string };
      if (!presignResponse.ok || !presign.file_key || !presign.presigned_url) throw new Error(presign.detail || "Bukti pembayaran tidak dapat disiapkan.");
      const uploadResponse = await fetch(presign.presigned_url, { method: "PUT", headers: { "Content-Type": receipt.type }, body: receipt });
      if (!uploadResponse.ok) throw new Error("Bukti pembayaran gagal diunggah.");
      await submitPaymentProof(selected, method, { object_key: presign.file_key, original_name: receipt.name });
      setResult({ text: `Pembayaran ${rupiah(receiptAmount)} berhasil dikirim dan menunggu verifikasi sekolah.` });
      setOpen(false);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Pembayaran tidak dapat dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  function acceptDroppedFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setReceipt(file);
      setError("");
    }
  }

  return <>
    {result ? <PaymentVerificationStatus description={result.text} /> : <button className="primary-button payment-upload-trigger" type="button" disabled={!selected || submitting} onClick={() => { setError(""); setReceipt(null); if (receiptInput.current) receiptInput.current.value = ""; setOpen(true); }}><FileUp /> {triggerLabel}</button>}
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="payment-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
        <header><span><Landmark /></span><div><h2 id="payment-dialog-title">Konfirmasi pembayaran</h2><p>Kirim pembayaran untuk {child.firstName}.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button></header>
        <div className="bank-detail"><small>REKENING SEKOLAH</small><strong>Bank Mandiri · 123-456-7890</strong><span>a.n. TK Harapan Bangsa</span></div>
        <form onSubmit={submitPayment}>
          <div className="payment-upload-summary">
            <div><span>Jenis tagihan</span><strong>{selected?.feeType || "—"}</strong></div>
            <div><span>Periode</span><strong>{selected?.month || "—"}</strong></div>
            <p>Jumlah yang dikirim <strong>{selected ? rupiah(remainingBefore) : "—"}</strong></p>
          </div>
          <label>Metode pembayaran<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option></select></label>
          <div className="payment-upload-field">
            <span className="payment-upload-label" id="receipt-upload-label">Unggah bukti pembayaran</span>
            <div className={`file-drop${isDraggingFile ? " is-dragging" : ""}`} aria-labelledby="receipt-upload-label" onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }} onDragLeave={() => setIsDraggingFile(false)} onDrop={acceptDroppedFile}>
              <FileUp aria-hidden="true" />
              <div className="file-drop-content">
                <span>{receipt?.name || "Seret foto atau PDF bukti ke sini"}</span>
                <button className="file-picker-button" type="button" onClick={() => receiptInput.current?.click()}>Pilih berkas</button>
              </div>
              <input ref={receiptInput} className="file-input-hidden" name="receipt" type="file" aria-labelledby="receipt-upload-label" accept="image/jpeg,image/png,application/pdf" onChange={(event) => { setReceipt(event.target.files?.[0] || null); setError(""); }} />
            </div>
            <small id="receipt-file-hint">JPG, PNG, atau PDF · Maks. 10 MB</small>
          </div>
          <p className="field-note">Pembayaran akan dikirim untuk diverifikasi oleh pihak sekolah.</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <footer><button className="outline-button" type="button" onClick={() => setOpen(false)} disabled={submitting}>Batal</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Mengirim pembayaran…" : "Kirim pembayaran"}</button></footer>
        </form>
      </section>
    </div>}
  </>;
}
