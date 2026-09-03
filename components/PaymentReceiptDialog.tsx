"use client";

import { CheckCircle2, FileUp, Landmark, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { ChildProfile, Invoice } from "@/lib/data";

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function PaymentReceiptDialog({ child, invoices }: { child: ChildProfile; invoices: readonly Invoice[] }) {
  const unpaid = useMemo(() => invoices.filter((invoice) => invoice.paidAmount < invoice.billAmount), [invoices]);
  const [open, setOpen] = useState(false);
  const [invoiceSlug, setInvoiceSlug] = useState(unpaid[0]?.slug || "");
  const [result, setResult] = useState<{ paid: boolean; text: string } | null>(null);
  const selected = unpaid.find((invoice) => invoice.slug === invoiceSlug) || unpaid[0];

  function verifyPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const receiptAmount = Number(form.get("receiptAmount") || 0);
    const remainingBefore = Math.max(0, (selected?.billAmount || 0) - (selected?.paidAmount || 0));
    const remaining = Math.max(0, remainingBefore - receiptAmount);
    setResult(remaining === 0
      ? { paid: true, text: `Lunas — bukti ${rupiah(receiptAmount)} sesuai dengan sisa tagihan ${selected?.month}.` }
      : { paid: false, text: `Pembayaran sebagian diterima. Sisa yang perlu dibayar berikutnya ${rupiah(remaining)}.` });
  }

  return (
    <>
      <button className="primary-button payment-upload-trigger" type="button" onClick={() => { setResult(null); setOpen(true); }}><FileUp /> Bayar & unggah bukti</button>
      {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="payment-upload-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
          <header><span><Landmark /></span><div><h2 id="payment-dialog-title">Konfirmasi pembayaran</h2><p>Transfer melalui bank, lalu unggah bukti pembayaran {child.firstName}.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button></header>
          <div className="bank-detail"><small>REKENING SEKOLAH</small><strong>Bank Mandiri · 123-456-7890</strong><span>a.n. TK Harapan Bangsa</span></div>
          <form onSubmit={verifyPayment}>
            <label>Bulan pembayaran<select value={invoiceSlug} onChange={(event) => { setInvoiceSlug(event.target.value); setResult(null); }}>{unpaid.map((invoice) => <option value={invoice.slug} key={invoice.slug}>{invoice.month} · sisa {rupiah(invoice.billAmount - invoice.paidAmount)}</option>)}</select></label>
            <label>Unggah bukti transfer<span className="file-drop"><FileUp /><input name="receipt" type="file" accept="image/*,.pdf" required />Pilih foto atau PDF bukti</span></label>
            <label>Jumlah yang tertera pada bukti<input name="receiptAmount" type="number" min="1" max="10000000" step="1000" placeholder="Contoh: 250000" required /></label>
            <p className="field-note">Prototype ini membandingkan nominal yang Anda masukkan. Versi produksi dapat memakai verifikasi bank atau OCR di backend.</p>
            {result && <div className={`payment-result ${result.paid ? "paid" : "partial"}`} role="status"><CheckCircle2 /><div><strong>{result.paid ? "Lunas" : "Masih ada sisa"}</strong><p>{result.text}</p></div></div>}
            <footer><button className="outline-button" type="button" onClick={() => setOpen(false)}>Batal</button><button className="primary-button" type="submit">Periksa pembayaran</button></footer>
          </form>
        </section>
      </div>}
    </>
  );
}
