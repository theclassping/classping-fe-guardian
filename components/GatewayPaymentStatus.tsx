"use client";

import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Clock3, Copy, ExternalLink, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cancelGatewayPayment, fetchGatewayPayment, formatDateTime, gatewayMode, isExpired, isExternalMethod, rupiah, STATUS_LABELS, statusTone, timeLeft, type GatewayPayment } from "@/lib/gateway";

const POLL_MS = 10_000;

/**
 * Instructions + live status for one online checkout. Also the landing view
 * after the parent returns from an external payment page (`returned`), where
 * polling continues until the provider callback marks it paid.
 */
export default function GatewayPaymentStatus({ paymentId, listHref, childQuery, returned = false }: { paymentId: string; listHref: string; childQuery: string; returned?: boolean }) {
  const router = useRouter();
  const [payment, setPayment] = useState<GatewayPayment | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  async function load() {
    try {
      const next = await fetchGatewayPayment(paymentId);
      setPayment(next);
      setError("");
      if (next?.status === "paid") router.refresh();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Status pembayaran tidak dapat dimuat.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const poll = window.setInterval(() => void load(), returned ? POLL_MS / 2 : POLL_MS);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => { window.clearInterval(poll); window.clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.status, paymentId, returned]);

  useEffect(() => {
    if (payment?.payment_method === "qris" && payment.payment_code) {
      QRCode.toDataURL(payment.payment_code, { width: 260, margin: 1, color: { dark: "#3A2F27", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(""));
    }
  }, [payment?.payment_method, payment?.payment_code]);

  async function copyCode(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  }

  async function simulatePaid() {
    const { dummyMarkPaid } = await import("@/lib/gatewayDummy");
    dummyMarkPaid(paymentId);
    await load();
  }

  async function cancel() {
    setCancelling(true);
    setCancelError("");
    try {
      const next = await cancelGatewayPayment(paymentId);
      setPayment(next);
      setConfirmingCancel(false);
      router.refresh();
    } catch (cancelFailure) {
      setCancelError(cancelFailure instanceof Error ? cancelFailure.message : "Pembayaran tidak dapat dibatalkan.");
      void load();
    } finally {
      setCancelling(false);
    }
  }

  if (payment === undefined && !error) return <article className="detail-page payment-detail"><Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link><section className="empty-state panel" role="status"><span aria-hidden="true">⏳</span><h2>{returned ? "Memeriksa status pembayaran…" : "Memuat instruksi pembayaran…"}</h2></section></article>;
  if (payment === null) return <article className="detail-page payment-detail"><Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link><section className="empty-state panel" role="status"><span aria-hidden="true">🔎</span><h2>Pembayaran tidak ditemukan</h2><p>Transaksi ini tidak tersedia atau bukan milik anak Anda.</p><div className="payment-lookup-actions"><Link className="primary-button" href={listHref}>Lihat daftar tagihan</Link></div></section></article>;
  if (!payment) return <article className="detail-page payment-detail"><Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link><section className="empty-state panel" role="alert"><span aria-hidden="true">⏳</span><h2>Status belum dapat dimuat</h2><p>{error}</p><div className="payment-lookup-actions"><button className="outline-button" type="button" onClick={() => void load()}><RefreshCw /> Coba lagi</button></div></section></article>;

  const expired = isExpired(payment, now);
  const status = expired ? "expired" : payment.status;
  const remaining = status === "pending" ? timeLeft(payment.expires_at, now) : "";
  const external = isExternalMethod(payment.payment_method);
  /** Finished without payment: the invoices are free to be paid again. */
  const ended = status === "expired" || status === "cancelled" || status === "failed";

  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className={`invoice-card panel gateway-status is-${status}`}>
        <header><div><p className="eyebrow">PEMBAYARAN ONLINE</p><h1>{payment.channel_name || payment.channel_code}</h1><p>{payment.payment_no}</p></div><span className={`status-badge ${statusTone(status)}`}>{STATUS_LABELS[status]}</span></header>

        <div className="invoice-total"><small>Total yang harus dibayar</small><strong>{rupiah(payment.amount)}</strong><span>Tagihan {rupiah(payment.invoice_total)} + biaya transaksi {rupiah(payment.transaction_fee)}</span></div>

        {status === "paid" && (
          <div className="payment-result gateway-paid" role="status">
            <CheckCircle2 aria-hidden="true" />
            <div><strong>Pembayaran diterima</strong><p>Dibayar pada {formatDateTime(payment.paid_at)}. Tagihan di bawah ini sudah tercatat lunas tanpa perlu verifikasi manual.</p></div>
          </div>
        )}

        {status === "expired" && (
          <div className="payment-rejection-message" role="alert">
            <p><strong>Instruksi pembayaran sudah kedaluwarsa.</strong></p>
            <p>Batas waktu berakhir pada {formatDateTime(payment.expires_at)}. Tagihan kembali dapat dibayar. Buat pembayaran online baru dari daftar tagihan atau unggah bukti transfer.</p>
          </div>
        )}

        {status === "cancelled" && (
          <div className="gateway-cancelled" role="status">
            <Ban aria-hidden="true" />
            <div><strong>Pembayaran dibatalkan</strong><p>Transaksi ini tidak dapat dipakai lagi. Tagihan di bawah ini kembali dapat dibayar online dengan metode lain atau lewat transfer manual.</p></div>
          </div>
        )}

        {status === "failed" && (
          <div className="payment-rejection-message" role="alert">
            <p><strong>Pembayaran online tidak dapat dibuat.</strong></p>
            <p>Penyedia pembayaran tidak mengirimkan instruksi pembayaran, jadi tidak ada dana yang ditagihkan. Tagihan kembali dapat dibayar. Coba lagi dengan metode lain atau unggah bukti transfer.</p>
          </div>
        )}

        {status === "pending" && (
          <>
            {returned && (
              <div className="gateway-returned" role="status">
                <RefreshCw aria-hidden="true" />
                <div><strong>Menunggu konfirmasi dari {payment.channel_name || "penyedia pembayaran"}</strong><p>Jika Anda sudah menyelesaikan pembayaran, status akan berubah menjadi lunas dalam beberapa saat. Halaman ini memeriksa status secara otomatis.</p></div>
              </div>
            )}

            <div className="gateway-deadline"><Clock3 aria-hidden="true" /><div><strong>Bayar sebelum {formatDateTime(payment.expires_at)}</strong><small>{remaining ? `Sisa waktu ${remaining}` : "Batas waktu hampir habis"} · status diperbarui otomatis</small></div></div>

            {payment.payment_method === "virtual_account" && payment.payment_code && (
              <div className="gateway-instruction">
                <span className="gateway-instruction-label">Nomor Virtual Account</span>
                <div className="gateway-code"><code>{payment.payment_code}</code><button type="button" className="outline-button" onClick={() => void copyCode(payment.payment_code || "")}><Copy aria-hidden="true" /> {copied ? "Tersalin" : "Salin"}</button></div>
                <ol>
                  <li>Buka aplikasi m-banking atau ATM dan pilih menu transfer / pembayaran Virtual Account.</li>
                  <li>Masukkan nomor Virtual Account di atas dan pastikan nama penerima sesuai.</li>
                  <li>Bayar tepat sebesar <strong>{rupiah(payment.amount)}</strong>. Status di halaman ini akan berubah otomatis.</li>
                </ol>
              </div>
            )}

            {payment.payment_method === "qris" && payment.payment_code && (
              <div className="gateway-instruction gateway-qris">
                <span className="gateway-instruction-label">Pindai kode QRIS</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated in the browser */}
                {qr ? <img src={qr} alt="Kode QRIS pembayaran" width={260} height={260} /> : <p className="form-message">Menyiapkan kode QR…</p>}
                <ol>
                  <li>Buka aplikasi e-wallet atau m-banking yang mendukung QRIS.</li>
                  <li>Pindai kode di atas dan periksa nominal <strong>{rupiah(payment.amount)}</strong>.</li>
                  <li>Selesaikan pembayaran; status di halaman ini akan berubah otomatis.</li>
                </ol>
              </div>
            )}

            {external && payment.payment_link && (
              <div className="gateway-instruction">
                <span className="gateway-instruction-label">{payment.payment_method === "credit_card" ? "Pembayaran kartu kredit" : `Pembayaran lewat ${payment.channel_name || "aplikasi e-commerce"}`}</span>
                <a className="primary-button" href={payment.payment_link}>{returned ? "Buka lagi halaman pembayaran" : "Lanjutkan ke halaman pembayaran"} <ExternalLink aria-hidden="true" /></a>
                <ol>
                  <li>Anda akan diarahkan ke halaman {payment.channel_name || "penyedia pembayaran"} untuk menyelesaikan pembayaran sebesar <strong>{rupiah(payment.amount)}</strong>.</li>
                  <li>Setelah selesai, Anda dikembalikan ke halaman ini secara otomatis. Jika tidak, buka kembali halaman ini dari daftar tagihan.</li>
                  <li>Status berubah menjadi lunas begitu {payment.channel_name || "penyedia pembayaran"} mengonfirmasi pembayaran.</li>
                </ol>
              </div>
            )}

            <p className="payment-verification-live"><RefreshCw aria-hidden="true" /> Status diperbarui otomatis setiap {returned ? 5 : 10} detik.<button type="button" onClick={() => void load()}>Periksa sekarang</button></p>
            {gatewayMode() === "dummy" && <button type="button" className="outline-button gateway-simulate" onClick={() => void simulatePaid()}>Simulasi: tandai sudah dibayar</button>}

            <div className="gateway-cancel">
              {confirmingCancel ? (
                <div className="gateway-cancel-confirm" role="alertdialog" aria-labelledby="gateway-cancel-title">
                  <strong id="gateway-cancel-title">Batalkan pembayaran ini?</strong>
                  <p>Nomor pembayaran {payment.payment_no} tidak dapat dipakai lagi{payment.payment_method === "virtual_account" ? ", jadi jangan transfer ke Virtual Account di atas setelah dibatalkan" : ""}. Tagihan kembali dapat dibayar dengan metode lain. Pembayaran yang sudah terlanjur dikirim tidak dapat dibatalkan.</p>
                  {cancelError && <p className="form-message error" role="alert">{cancelError}</p>}
                  <div className="gateway-cancel-actions">
                    <button type="button" className="outline-button" disabled={cancelling} onClick={() => { setConfirmingCancel(false); setCancelError(""); }}>Kembali</button>
                    <button type="button" className="danger-button" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? "Membatalkan…" : "Ya, batalkan pembayaran"}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="gateway-cancel-trigger" onClick={() => setConfirmingCancel(true)}><Ban aria-hidden="true" /> Batalkan pembayaran</button>
              )}
            </div>
          </>
        )}

        <div className="gateway-items">
          <h2>Tagihan dalam pembayaran ini</h2>
          {payment.items.map((item) => (
            <div className="gateway-item" key={String(item.student_invoice_id)}>
              <div><strong>{item.fee_type || item.invoice_no || `Tagihan ${item.student_invoice_id}`}</strong><small>{[item.student_name, item.invoice_no].filter(Boolean).join(" · ")}</small></div>
              <Link href={`/dashboard/payments/${encodeURIComponent(String(item.student_invoice_id))}${childQuery}`}>{rupiah(item.amount)}</Link>
            </div>
          ))}
        </div>
        {ended && <footer className="gateway-footer"><Link className="primary-button" href={listHref}>Pilih tagihan lagi</Link></footer>}
        {status === "paid" && <footer className="gateway-footer"><Link className="primary-button" href={listHref}>Lihat riwayat pembayaran</Link></footer>}
      </section>
      <section className="privacy-card panel">{ended ? <XCircle /> : <ShieldCheck />}<div><h2>Transaksi terlindungi</h2><p>Pembayaran diproses oleh mitra pembayaran resmi. Jangan membagikan nomor Virtual Account atau tautan pembayaran kepada pihak lain.</p></div></section>
    </article>
  );
}
