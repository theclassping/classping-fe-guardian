"use client";

import Link from "next/link";
import { ArrowRight, Clock3, CreditCard } from "lucide-react";
import type { ChildProfile, Invoice } from "@/lib/data";
import { invoicePaymentState } from "@/lib/payments";
import { checkoutHref, formatDateTime, gatewayPaymentHref } from "@/lib/gateway";
import PaymentReceiptDialog from "@/components/PaymentReceiptDialog";
import { useGatewayOverlay } from "@/components/useGatewayOverlay";
import { isPayableOnline } from "@/components/PaymentList";

/**
 * Actions for an unpaid invoice. The manual proof-upload flow is always kept;
 * when the branch has the payment gateway, an online option is offered first,
 * and an invoice locked by a pending online checkout points to its instructions.
 */
export default function InvoicePaymentActions({ child, invoice, gatewayEnabled, childQuery, triggerId }: { child: ChildProfile; invoice: Invoice; gatewayEnabled: boolean; childQuery: string; triggerId?: string }) {
  const [current] = useGatewayOverlay([invoice]);
  const pending = current.pendingGatewayPayment;
  if (invoicePaymentState(current) === "paid" && current.method === "Pembayaran online") {
    return <div className="payment-result gateway-paid" role="status"><CreditCard aria-hidden="true" /><div><strong>Lunas melalui pembayaran online</strong><p>Tagihan ini sudah dibayar lewat pembayaran online dan tercatat otomatis.</p></div></div>;
  }
  if (pending) {
    return (
      <div className="gateway-pending-card" role="status">
        <Clock3 aria-hidden="true" />
        <div>
          <strong>Menunggu pembayaran online</strong>
          <p>Tagihan ini sedang dalam transaksi {pending.channelName || "pembayaran online"}{pending.expiresAt ? ` yang berlaku sampai ${formatDateTime(pending.expiresAt)}` : ""}. Unggah bukti transfer tidak tersedia sampai transaksi selesai, dibatalkan, atau kedaluwarsa.</p>
          <Link className="primary-button" href={gatewayPaymentHref(pending.id, childQuery)}>Lihat instruksi pembayaran <ArrowRight aria-hidden="true" /></Link>
        </div>
      </div>
    );
  }
  const online = gatewayEnabled && isPayableOnline(current);
  return (
    <div className="invoice-actions">
      {online && (
        <div className="gateway-option">
          <Link className="primary-button" href={checkoutHref([current.slug], childQuery)}><CreditCard aria-hidden="true" /> Bayar online</Link>
          <small>Virtual Account, kartu kredit, Tokopedia, atau Blibli. Tagihan langsung lunas tanpa verifikasi manual.</small>
        </div>
      )}
      <div className={online ? "manual-option" : undefined}>
        {online && <span className="invoice-actions-divider">atau</span>}
        <PaymentReceiptDialog child={child} invoices={[current]} triggerId={triggerId} triggerLabel={current.rejectionReason ? "Unggah bukti pembayaran baru" : online ? "Transfer manual & unggah bukti" : "Lanjutkan pembayaran"} />
      </div>
    </div>
  );
}
