"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CreditCard, QrCode, ShieldCheck, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ChildProfile } from "@/features/family/types";
import type { Invoice } from "@/features/payments/types";
import { createCheckout, durationLabel, fetchChannels, gatewayPaymentHref, gatewayRedirectHref, groupChannels, handoverLink, isExternalMethod, newIdempotencyKey, type GatewayChannelsResponse, type GatewayError } from "@/features/payments/gateway";
import { rupiah } from "@/lib/format";
import { isPayableOnline, remainingAmount, totalRemaining } from "@/features/payments/helpers";

const METHOD_ICONS = { virtual_account: Building2, credit_card: CreditCard, e_commerce: ShoppingBag, qris: QrCode } as const;

export default function GatewayCheckout({ child, invoices, listHref, childQuery }: { child: ChildProfile; invoices: readonly Invoice[]; listHref: string; childQuery: string }) {
  const router = useRouter();
  const payable = useMemo(() => invoices.filter(isPayableOnline), [invoices]);
  const blocked = invoices.filter((invoice) => !isPayableOnline(invoice));
  const invoiceTotal = totalRemaining(payable);
  const [channelState, setChannelState] = useState<{ key: string; data?: GatewayChannelsResponse; error?: string } | null>(null);
  const [channel, setChannel] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const invoiceKey = payable.map((invoice) => invoice.slug).join(",");

  useEffect(() => {
    if (!invoiceKey) return;
    let cancelled = false;
    fetchChannels(invoiceKey.split(","))
      .then((response) => { if (!cancelled) setChannelState({ key: invoiceKey, data: response }); })
      .catch((loadError: GatewayError) => { if (!cancelled) setChannelState({ key: invoiceKey, error: loadError.message }); });
    return () => { cancelled = true; };
  }, [invoiceKey]);

  const channels = channelState?.key === invoiceKey ? channelState.data : undefined;
  const channelsError = channelState?.key === invoiceKey ? channelState.error : undefined;
  const selectedChannel = channels?.channels.find((item) => item.code === channel);

  async function confirm() {
    if (!selectedChannel) return setError("Pilih metode pembayaran terlebih dahulu.");
    setSubmitting(true);
    setError("");
    try {
      const payment = await createCheckout({
        invoiceIds: payable.map((invoice) => invoice.slug),
        channel: selectedChannel.code,
        idempotencyKey,
      });
      // Card and e-commerce checkouts are paid on the provider's billing page: hand over right away.
      router.push(isExternalMethod(payment.payment_method) && handoverLink(payment) ? gatewayRedirectHref(payment.id, childQuery) : gatewayPaymentHref(payment.id, childQuery));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pembayaran online tidak dapat dibuat.");
      setSubmitting(false);
    }
  }

  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="invoice-card panel gateway-checkout">
        <header><div><p className="eyebrow">PEMBAYARAN ONLINE</p><h1>Pilih metode pembayaran</h1><p>{child.name} · {child.className}</p></div></header>

        <div className="gateway-items">
          <h2>Tagihan yang dibayar</h2>
          {payable.map((invoice) => (
            <div className="gateway-item" key={invoice.slug}>
              <div><strong>{invoice.feeType}</strong><small>{invoice.month}{invoice.invoiceNo ? ` · ${invoice.invoiceNo}` : ""}</small></div>
              <span>{rupiah(remainingAmount(invoice))}</span>
            </div>
          ))}
          {blocked.length > 0 && <p className="fine-note">{blocked.length} tagihan tidak dapat dibayar online (sudah lunas, sedang diverifikasi, atau menunggu pembayaran online lain) dan tidak disertakan.</p>}
          {payable.length === 0 && <p className="form-message error" role="alert">Tidak ada tagihan yang dapat dibayar online.</p>}
        </div>

        {payable.length > 0 && (
          <fieldset className="gateway-channels" disabled={submitting}>
            <legend>Metode pembayaran</legend>
            {channelsError ? (
              <p className="form-message error" role="alert">{channelsError}</p>
            ) : !channels ? (
              <p className="form-message" role="status">Memuat metode pembayaran…</p>
            ) : groupChannels(channels.channels).map((group) => {
              const Icon = METHOD_ICONS[group.method];
              return (
                <div className="gateway-channel-group" key={group.method}>
                  <h3><Icon aria-hidden="true" /> {group.label}</h3>
                  {group.channels.map((item) => (
                    <label className={`gateway-channel${channel === item.code ? " is-selected" : ""}`} key={item.code}>
                      <input type="radio" name="channel" value={item.code} checked={channel === item.code} onChange={() => { setChannel(item.code); setError(""); }} />
                      <span className="gateway-channel-name">{item.name}</span>
                      <span className="gateway-channel-fee">{Number(item.transaction_fee) > 0 ? `Biaya ${rupiah(item.transaction_fee)}` : "Tanpa biaya"}</span>
                      <strong>{rupiah(item.amount)}</strong>
                    </label>
                  ))}
                </div>
              );
            })}
          </fieldset>
        )}

        {payable.length > 0 && (
          <div className="gateway-summary">
            <div><span>Total tagihan</span><strong>{rupiah(invoiceTotal)}</strong></div>
            <div><span>Biaya transaksi</span><strong>{selectedChannel ? rupiah(selectedChannel.transaction_fee) : "—"}</strong></div>
            <div className="is-total"><span>Total dibayar</span><strong>{selectedChannel ? rupiah(selectedChannel.amount) : rupiah(invoiceTotal)}</strong></div>
            {channels && durationLabel(channels.payment_window_minutes) && <p>Instruksi pembayaran berlaku {durationLabel(channels.payment_window_minutes)} setelah Anda menekan Bayar sekarang.</p>}
          </div>
        )}

        {error && <p className="form-message error" role="alert">{error}</p>}
        <footer className="gateway-footer">
          <Link className="outline-button" href={listHref}>Batal</Link>
          <button className="primary-button" type="button" disabled={!selectedChannel || submitting || payable.length === 0} onClick={() => void confirm()}>{submitting ? "Menyiapkan pembayaran…" : <>Bayar sekarang <ArrowRight aria-hidden="true" /></>}</button>
        </footer>
      </section>
      <section className="privacy-card panel"><ShieldCheck /><div><h2>Pembayaran diproses mitra resmi</h2><p>Tagihan otomatis berubah menjadi lunas begitu pembayaran diterima. Biaya transaksi mengikuti metode yang dipilih dan dibayarkan bersama tagihan.</p></div></section>
    </article>
  );
}
