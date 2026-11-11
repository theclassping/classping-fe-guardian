"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ExternalLink, Home, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGatewayPayment, findGatewayPaymentByNo, gatewayPaymentHref, handoverLink, isExpired, type GatewayPayment } from "@/features/payments/gateway";
import { formatDateTime, rupiah } from "@/lib/format";

const POLL_MS = 5_000;

/**
 * "Back to ClassPing" landing page after the parent pays on the provider's
 * billing page. It resolves whichever reference the provider (or our own
 * hand-over page) put in the URL, keeps checking until the payment callback
 * marks it paid, and always offers a way back into the portal.
 */
export default function GatewayReturn({ reference, listHref, childQuery }: { reference: { id?: string; paymentNo?: string }; listHref: string; childQuery: string }) {
  const router = useRouter();
  const hasReference = Boolean(reference.id || reference.paymentNo);
  const [payment, setPayment] = useState<GatewayPayment | null | undefined>(hasReference ? undefined : null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => new Date());

  async function load() {
    setChecking(true);
    try {
      // A `payment_no`-only return URL resolves through the history list, which has no instructions or items.
      const id = reference.id || (reference.paymentNo ? (await findGatewayPaymentByNo(reference.paymentNo))?.id : undefined);
      const next = id !== undefined ? await fetchGatewayPayment(id) : null;
      setPayment(next);
      setNow(new Date());
      if (next?.status === "paid") router.refresh();
    } catch {
      setPayment((current) => current ?? null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!hasReference) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.id, reference.paymentNo]);

  useEffect(() => {
    if (!payment || payment.status !== "pending" || isExpired(payment, now)) return;
    const poll = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.status, payment?.id]);

  const status = payment ? (isExpired(payment, now) ? "expired" : payment.status) : undefined;
  const ended = status === "expired" || status === "cancelled" || status === "failed";
  const statusHref = payment ? gatewayPaymentHref(payment.id, childQuery) : listHref;
  const title = payment === undefined ? "Memeriksa pembayaran Anda…"
    : status === "paid" ? "Pembayaran berhasil"
    : status === "pending" ? "Terima kasih, pembayaran sedang dikonfirmasi"
    : status === "expired" ? "Pembayaran kedaluwarsa"
    : status === "cancelled" ? "Pembayaran dibatalkan"
    : status === "failed" ? "Pembayaran tidak dapat dibuat"
    : "Selamat datang kembali";

  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className={`invoice-card panel gateway-done${status ? ` is-${status}` : ""}`} aria-live="polite">
        <header><div><p className="eyebrow">KEMBALI KE CLASSPING</p><h1>{title}</h1>{payment && <p>{payment.payment_no}</p>}</div></header>

        {payment === undefined && (
          <div className="gateway-done-state" role="status">
            <span className="gateway-done-icon is-waiting" aria-hidden="true"><RefreshCw /></span>
            <p>Anda baru kembali dari halaman pembayaran. Mohon tunggu, kami sedang mengambil status transaksi Anda.</p>
          </div>
        )}

        {payment === null && (
          <div className="gateway-done-state" role="status">
            <span className="gateway-done-icon is-neutral" aria-hidden="true"><Home /></span>
            <p>{hasReference ? "Kami tidak menemukan transaksi dari tautan ini. Jika Anda sudah membayar, statusnya tetap dapat dilihat di riwayat pembayaran online." : "Anda kembali ke portal ClassPing. Status pembayaran online dapat dilihat di daftar tagihan."}</p>
          </div>
        )}

        {payment && status === "paid" && (
          <div className="gateway-done-state" role="status">
            <span className="gateway-done-icon is-paid" aria-hidden="true"><CheckCircle2 /></span>
            <p><strong>{rupiah(payment.amount)}</strong> diterima pada {formatDateTime(payment.paid_at)} melalui {payment.channel_name || payment.channel_code}. Tagihan sudah tercatat lunas tanpa perlu verifikasi manual.</p>
            {payment.needs_refund && <p>Tagihan ini ternyata sudah dilunasi dengan cara lain, jadi sekolah akan mengembalikan dana pembayaran ini.</p>}
          </div>
        )}

        {payment && status === "pending" && (
          <div className="gateway-done-state" role="status">
            <span className="gateway-done-icon is-waiting" aria-hidden="true"><Clock3 /></span>
            <p>Kami menunggu konfirmasi <strong>{rupiah(payment.amount)}</strong> dari {payment.channel_name || "penyedia pembayaran"}. Jika Anda sudah menyelesaikan pembayaran, status berubah menjadi lunas dalam beberapa saat. Jika belum, instruksi pembayaran berlaku sampai {formatDateTime(payment.expires_at)}.</p>
            <p className="payment-verification-live"><RefreshCw aria-hidden="true" /> Status diperiksa otomatis setiap 5 detik.<button type="button" disabled={checking} onClick={() => void load()}>{checking ? "Memeriksa…" : "Periksa sekarang"}</button></p>
            {handoverLink(payment) && <a className="gateway-done-reopen" href={handoverLink(payment)}>Belum membayar? Buka lagi halaman pembayaran <ExternalLink aria-hidden="true" /></a>}
          </div>
        )}

        {payment && ended && (
          <div className="gateway-done-state" role="alert">
            <span className="gateway-done-icon is-failed" aria-hidden="true"><XCircle /></span>
            <p>{status === "expired" ? `Batas waktu pembayaran berakhir pada ${formatDateTime(payment.expires_at)}.` : status === "cancelled" ? "Transaksi ini sudah dibatalkan." : "Penyedia pembayaran tidak mengirimkan instruksi pembayaran, jadi tidak ada dana yang ditagihkan."} Tagihan kembali dapat dibayar online dengan metode lain atau lewat transfer manual.</p>
          </div>
        )}

        {payment && payment.items.length > 0 && (
          <div className="gateway-items">
            <h2>Tagihan dalam pembayaran ini</h2>
            {payment.items.map((item) => (
              <div className="gateway-item" key={String(item.student_invoice_id)}>
                <div><strong>{item.fee_type || item.invoice_no || `Tagihan ${item.student_invoice_id}`}</strong><small>{[item.student_name, item.invoice_no].filter(Boolean).join(" · ")}</small></div>
                <span>{rupiah(item.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <footer className="gateway-footer gateway-done-actions">
          {payment && <Link className="outline-button" href={statusHref}>Lihat detail transaksi</Link>}
          <Link className="primary-button" href={listHref}><Home aria-hidden="true" /> Kembali ke portal ClassPing <ArrowRight aria-hidden="true" /></Link>
        </footer>
      </section>
    </article>
  );
}
