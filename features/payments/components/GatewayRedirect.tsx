"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGatewayPayment, gatewayPaymentHref, gatewayReturnHref, handoverLink, isExpired, isExternalMethod, type GatewayPayment } from "@/features/payments/gateway";
import { rupiah } from "@/lib/format";

const COUNTDOWN_SECONDS = 4;
const HANDOVER_KEY = "classping.gateway.handover";

function handoverDone(id: string) {
  try { return window.sessionStorage.getItem(`${HANDOVER_KEY}.${id}`) === "1"; } catch { return false; }
}

function markHandover(id: string) {
  try { window.sessionStorage.setItem(`${HANDOVER_KEY}.${id}`, "1"); } catch { /* ignore */ }
}

/**
 * Hand-over page between the checkout and the provider's billing page
 * (Rintisan card form, Tokopedia, Blibli). It shows what is about to be paid,
 * counts down, then sends the browser to the billing page. Coming back with the
 * browser's Back button lands here again, so the second visit does not
 * redirect: it offers "I have paid" (→ return page) and "open again" instead.
 */
export default function GatewayRedirect({ paymentId, listHref, childQuery }: { paymentId: string; listHref: string; childQuery: string }) {
  const router = useRouter();
  const [payment, setPayment] = useState<GatewayPayment | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [returned, setReturned] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const statusHref = gatewayPaymentHref(paymentId, childQuery);

  useEffect(() => {
    let cancelled = false;
    fetchGatewayPayment(paymentId)
      .then((item) => { if (!cancelled) { setReturned(handoverDone(paymentId)); setPayment(item); } })
      .catch((loadError: Error) => { if (!cancelled) { setPayment(null); setError(loadError.message); } });
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) setReturned(true); };
    window.addEventListener("pageshow", onShow);
    return () => { cancelled = true; window.removeEventListener("pageshow", onShow); };
  }, [paymentId]);

  const link = payment ? handoverLink(payment) : "";
  const redirectable = Boolean(payment && payment.status === "pending" && !isExpired(payment) && isExternalMethod(payment.payment_method) && link);

  useEffect(() => {
    if (payment === undefined) return;
    if (!redirectable) { router.replace(statusHref); return; }
    if (returned) return;
    if (seconds <= 0) { markHandover(paymentId); window.location.assign(link); return; }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [payment, redirectable, returned, seconds, link, paymentId, router, statusHref]);

  function openNow() {
    markHandover(paymentId);
    window.location.assign(link);
  }

  const doneHref = payment ? gatewayReturnHref(payment) : listHref;
  const providerName = payment?.payment_method === "credit_card" ? "Rintisan" : payment?.channel_name || "penyedia pembayaran";

  if (payment === undefined) {
    return <article className="detail-page payment-detail"><Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link><section className="empty-state panel" role="status"><span aria-hidden="true">⏳</span><h2>Menyiapkan halaman pembayaran…</h2></section></article>;
  }
  if (!payment || !redirectable) {
    return <article className="detail-page payment-detail"><Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link><section className="empty-state panel" role="status"><span aria-hidden="true">🔎</span><h2>{payment ? "Membuka status pembayaran…" : "Pembayaran tidak ditemukan"}</h2>{error && <p>{error}</p>}<div className="payment-lookup-actions"><Link className="primary-button" href={payment ? statusHref : listHref}>{payment ? "Lihat status pembayaran" : "Lihat daftar tagihan"}</Link></div></section></article>;
  }

  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={statusHref}><ArrowLeft /> Kembali ke instruksi pembayaran</Link>
      <section className={`invoice-card panel gateway-redirect${returned ? " is-returned" : ""}`} aria-live="polite">
        <header><div><p className="eyebrow">PEMBAYARAN ONLINE</p><h1>{returned ? "Sudah selesai membayar?" : `Mengalihkan ke halaman pembayaran ${providerName}`}</h1><p>{payment.payment_no}</p></div></header>

        <div className="invoice-total"><small>Total yang dibayar</small><strong>{rupiah(payment.amount)}</strong><span>{payment.channel_name || payment.channel_code} · tagihan {rupiah(payment.invoice_total)} + biaya transaksi {rupiah(payment.transaction_fee)}</span></div>

        {returned ? (
          <div className="gateway-redirect-returned">
            <p>Anda kembali dari halaman pembayaran {providerName}. Jika pembayaran sudah dikirim, lanjutkan ke ClassPing untuk memeriksa statusnya. Jika belum, buka lagi halaman pembayaran.</p>
            <div className="gateway-footer">
              <button type="button" className="outline-button" onClick={openNow}>Buka lagi halaman pembayaran <ExternalLink aria-hidden="true" /></button>
              <Link className="primary-button" href={doneHref}><CheckCircle2 aria-hidden="true" /> Saya sudah membayar</Link>
            </div>
          </div>
        ) : (
          <div className="gateway-redirect-countdown" role="status">
            <div className="gateway-redirect-bar" aria-hidden="true"><span style={{ width: `${((COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS) * 100}%` }} /></div>
            <p>Dalam <strong>{seconds} detik</strong> Anda akan dibawa ke halaman pembayaran {providerName}{` (${new URL(link).hostname})`}.</p>
            <div className="gateway-footer">
              <Link className="outline-button" href={statusHref}>Nanti saja</Link>
              <button type="button" className="primary-button" onClick={openNow}>Buka halaman pembayaran sekarang <ExternalLink aria-hidden="true" /></button>
            </div>
          </div>
        )}

        <ol className="gateway-redirect-steps">
          <li>Selesaikan pembayaran sebesar <strong>{rupiah(payment.amount)}</strong> di halaman {providerName}. Nomor tagihan di sana sama dengan <strong>{payment.payment_no}</strong>.</li>
          <li>Setelah pembayaran berhasil, kembali ke ClassPing. Gunakan tombol kembali di peramban atau buka tautan <Link href={doneHref}>konfirmasi pembayaran</Link>.</li>
          <li>Tagihan tercatat lunas otomatis begitu {providerName} mengonfirmasi pembayaran, tanpa unggah bukti.</li>
        </ol>
      </section>
      <section className="privacy-card panel"><ShieldCheck /><div><h2>Halaman pembayaran resmi</h2><p>Pembayaran diproses oleh mitra resmi sekolah. Pastikan alamat halaman pembayaran sesuai dengan yang tertulis di atas dan jangan membagikan tautannya kepada pihak lain.</p></div></section>
    </article>
  );
}
