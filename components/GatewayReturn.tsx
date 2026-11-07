"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGatewayPayment, findGatewayPaymentByNo, gatewayPaymentHref } from "@/lib/gateway";

/** Resolves the payment named in the return URL, then opens its status page flagged as "returned". */
export default function GatewayReturn({ reference, listHref, childQuery }: { reference: { id?: string; paymentNo?: string }; listHref: string; childQuery: string }) {
  const router = useRouter();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const payment = reference.id ? await fetchGatewayPayment(reference.id).catch(() => null) : reference.paymentNo ? await findGatewayPaymentByNo(reference.paymentNo).catch(() => null) : null;
      if (cancelled) return;
      if (!payment) return setMissing(true);
      router.replace(`${gatewayPaymentHref(payment.id, childQuery)}${childQuery ? "&" : "?"}returned=1`);
    })();
    return () => { cancelled = true; };
  }, [reference.id, reference.paymentNo, childQuery, router]);

  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="empty-state panel" role="status">
        <span aria-hidden="true">{missing ? "🔎" : "⏳"}</span>
        <h2>{missing ? "Transaksi tidak ditemukan" : "Memeriksa status pembayaran…"}</h2>
        <p>{missing ? "Kami tidak menemukan transaksi dari tautan ini. Buka riwayat pembayaran online di daftar tagihan untuk melihat statusnya." : "Anda baru kembali dari halaman pembayaran. Mohon tunggu, kami sedang mengambil status transaksi Anda."}</p>
        {missing && <div className="payment-lookup-actions"><Link className="primary-button" href={listHref}>Lihat daftar tagihan</Link></div>}
      </section>
    </article>
  );
}
