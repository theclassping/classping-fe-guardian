"use client";

import Link from "next/link";
import { ArrowRight, Clock3, CreditCard } from "lucide-react";
import type { ChildProfile } from "@/features/family/types";
import type { Invoice } from "@/features/payments/types";
import { isPayableOnline } from "@/features/payments/helpers";
import { checkoutHref, gatewayPaymentHref } from "@/features/payments/gateway";
import { formatDateTime } from "@/lib/format";
import PaymentReceiptDialog from "@/features/payments/components/PaymentReceiptDialog";

/**
 * Actions for an unpaid invoice. The manual proof-upload flow is always kept;
 * when the branch has the payment gateway, an online option is offered first,
 * and an invoice locked by a pending online checkout points to its instructions.
 */
export default function InvoicePaymentActions({ child, invoice: current, gatewayEnabled, childQuery, triggerId }: { child: ChildProfile; invoice: Invoice; gatewayEnabled: boolean; childQuery: string; triggerId?: string }) {
  const pending = current.pendingGatewayPayment;
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
