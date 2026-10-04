"use client";

import { CheckCircle2, FileUp, Landmark, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { ChildProfile, Invoice } from "@/lib/data";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function PaymentReceiptDialog({ child, invoices, triggerLabel = "Bayar & unggah bukti" }: { child: ChildProfile; invoices: readonly Invoice[]; triggerLabel?: string }) {
  const unpaid = useMemo(() => invoices.filter((invoice) => invoice.paidAmount < invoice.billAmount), [invoices]);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("bank_transfer");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ text: string } | null>(null);
  const selected = unpaid[0];
  const remainingBefore = Math.max(0, (selected?.billAmount || 0) - (selected?.paidAmount || 0));

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const receipt = form.get("receipt");
    setError("");
    setResult(null);
    if (!(receipt instanceof File) || !receipt.size) return setError("Pilih bukti pembayaran terlebih dahulu.");
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(receipt.type)) return setError("Bukti harus berupa JPG, PNG, atau PDF.");
    if (receipt.size > 10 * 1024 * 1024) return setError("Ukuran bukti maksimal 10 MB.");
    const receiptAmount = remainingBefore;
    if (!selected || receiptAmount <= 0) return setError("Tidak ada tagihan yang dapat dibayar.");
    const invoiceId = Number(selected.slug);
    if (!Number.isInteger(invoiceId)) return setError("Tagihan demo belum memiliki ID backend untuk dikirim.");

    setSubmitting(true);
    try {
      const presignResponse = await fetch("/api/proxy/media/presign/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: receipt.name, content_type: receipt.type, expires_in: 3600 }) });
      const presign = (await presignResponse.json()) as { file_key?: string; presigned_url?: string; detail?: string };
      if (!presignResponse.ok || !presign.file_key || !presign.presigned_url) throw new Error(presign.detail || "Bukti pembayaran tidak dapat disiapkan.");
      const uploadResponse = await fetch(presign.presigned_url, { method: "PUT", headers: { "Content-Type": receipt.type }, body: receipt });
      if (!uploadResponse.ok) throw new Error("Bukti pembayaran gagal diunggah.");
      const paymentResponse = await fetch("/api/proxy/payments/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_invoice_id: invoiceId, amount: receiptAmount.toFixed(2), payment_method: method, proofs: [{ image_data: { file_key: presign.file_key, url: presign.presigned_url, original_name: receipt.name } }] }) });
      const payment = (await paymentResponse.json().catch(() => ({}))) as { detail?: string };
      if (!paymentResponse.ok) throw new Error(payment.detail || "Pembayaran tidak dapat dikirim.");
      setResult({ text: `Pembayaran ${rupiah(receiptAmount)} berhasil dikirim dan menunggu verifikasi sekolah.` });
      setOpen(false);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Pembayaran tidak dapat dikirim.");
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <button className="primary-button payment-upload-trigger" type="button" onClick={() => { setResult(null); setError(""); setOpen(true); }}><FileUp /> {triggerLabel}</button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="payment-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
        <header><span><Landmark /></span><div><h2 id="payment-dialog-title">Konfirmasi pembayaran</h2><p>Kirim pembayaran untuk {child.firstName}.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button></header>
        <div className="bank-detail"><small>REKENING SEKOLAH</small><strong>Bank Mandiri · 123-456-7890</strong><span>a.n. TK Harapan Bangsa</span></div>
        <form onSubmit={submitPayment}>
          <div className="payment-upload-summary"><span>Tagihan</span><strong>{selected?.month || "—"}</strong><small>Jumlah yang dikirim: {selected ? rupiah(remainingBefore) : "—"}</small></div>
          <label>Metode pembayaran<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="bank_transfer">Transfer Bank</option><option value="cash">Tunai</option></select></label>
          <label>Unggah bukti pembayaran<span className="file-drop"><FileUp /><input name="receipt" type="file" accept="image/jpeg,image/png,application/pdf" required onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} />{fileName || "Pilih foto atau PDF bukti"}</span><small>JPG, PNG, atau PDF · Maks. 10 MB</small></label>
          <p className="field-note">Pembayaran akan dikirim untuk diverifikasi oleh pihak sekolah.</p>
          {error && <p className="form-message error" role="alert">{error}</p>}
          {result && <div className="payment-result partial" role="status"><CheckCircle2 /><div><strong>Menunggu verifikasi</strong><p>{result.text}</p></div></div>}
          <footer><button className="outline-button" type="button" onClick={() => setOpen(false)} disabled={submitting}>Batal</button><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Mengirim pembayaran…" : "Kirim pembayaran"}</button></footer>
        </form>
      </section>
    </div>}
  </>;
}
