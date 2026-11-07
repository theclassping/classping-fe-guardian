"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGatewayPayment, gatewayReturnHref, rupiah, type GatewayPayment } from "@/lib/gateway";

/** Pretend provider page (card form / e-commerce app) used only in dummy mode. */
export default function GatewayProviderSimulator({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [payment, setPayment] = useState<GatewayPayment | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchGatewayPayment(paymentId).then((item) => { if (!cancelled) setPayment(item); }).catch(() => { if (!cancelled) setPayment(null); });
    return () => { cancelled = true; };
  }, [paymentId]);

  async function finish(pay: boolean) {
    if (!payment) return;
    if (pay) {
      const { dummyMarkPaid } = await import("@/lib/gatewayDummy");
      dummyMarkPaid(payment.id);
    }
    router.replace(gatewayReturnHref(payment));
  }

  return (
    <article className="detail-page payment-detail">
      <section className="invoice-card panel gateway-simulator">
        <header><div><p className="eyebrow">SIMULASI HALAMAN PENYEDIA</p><h1>{payment?.channel_name || "Halaman pembayaran"}</h1><p>Halaman ini meniru halaman kartu / aplikasi e-commerce milik penyedia. Tidak tampil di mode API.</p></div></header>
        {payment === undefined && <p className="form-message" role="status">Memuat transaksi…</p>}
        {payment === null && <p className="form-message error" role="alert">Transaksi tidak ditemukan.</p>}
        {payment && (
          <>
            <div className="invoice-total"><small>Jumlah pembayaran</small><strong>{rupiah(payment.amount)}</strong><span>{payment.payment_no}</span></div>
            <div className="gateway-footer">
              <button type="button" className="outline-button" onClick={() => void finish(false)}>Batal, kembali tanpa membayar</button>
              <button type="button" className="primary-button" disabled={payment.status !== "pending"} onClick={() => void finish(true)}>Bayar sekarang (simulasi)</button>
            </div>
          </>
        )}
      </section>
    </article>
  );
}
