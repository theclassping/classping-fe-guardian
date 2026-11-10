"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchGatewayPayments, gatewayPaymentHref, isExpired, STATUS_LABELS, statusTone, type GatewayPaymentSummary } from "@/lib/gateway";
import { formatDateTime, rupiah } from "@/lib/format";

export default function GatewayPaymentHistory({ studentId, childQuery }: { studentId?: string; childQuery: string }) {
  const [payments, setPayments] = useState<GatewayPaymentSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchGatewayPayments(studentId)
      .then((items) => { if (!cancelled) setPayments(items); })
      .catch((loadError) => { if (!cancelled) { setError(loadError instanceof Error ? loadError.message : "Riwayat tidak dapat dimuat."); setPayments([]); } });
    return () => { cancelled = true; };
  }, [studentId]);

  if (!payments || (!payments.length && !error)) return null;
  return (
    <section className="gateway-history panel" aria-labelledby="gateway-history-title">
      <header><div><h2 id="gateway-history-title">Transaksi pembayaran online</h2><p>Satu transaksi dapat mencakup beberapa tagihan.</p></div></header>
      {error ? <p className="form-message error" role="alert">{error}</p> : (
        <ul>
          {payments.map((payment) => {
            const status = isExpired(payment) ? "expired" : payment.status;
            return (
              <li key={String(payment.id)}>
                <Link href={gatewayPaymentHref(payment.id, childQuery)}>
                  <div><strong>{payment.channel_name || payment.channel_code}</strong><small>{payment.payment_no} · {payment.invoice_count} tagihan ·{formatDateTime(payment.paid_at || payment.created_at || payment.expires_at)}</small></div>
                  <span>{rupiah(payment.amount)}</span>
                  <span className={`status-badge ${statusTone(status)}`}>{STATUS_LABELS[status]}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
