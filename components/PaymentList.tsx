"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChildId, Invoice } from "@/lib/data";
import { invoicePaymentState } from "@/lib/payments";
import { checkoutHref, rupiah } from "@/lib/gateway";
import { useGatewayOverlay } from "@/components/useGatewayOverlay";

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function isPayableOnline(invoice: Invoice) {
  return invoicePaymentState(invoice) === "unpaid" && invoice.paidAmount < invoice.billAmount && invoice.payableViaGateway !== false && !invoice.pendingGatewayPayment;
}

export default function PaymentList({ items, childId, studentId, gatewayEnabled = false }: { items: readonly Invoice[]; childId: ChildId; studentId?: string; gatewayEnabled?: boolean }) {
  const invoices = useGatewayOverlay(items);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const childQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${childId}`;
  const filtered = useMemo(() => invoices.filter((item) => {
    const matchesQuery = `${item.feeType} ${item.month} ${item.slug}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || normalizeStatus(item.status) === status;
    return matchesQuery && matchesStatus;
  }), [invoices, query, status]);
  const payable = useMemo(() => invoices.filter(isPayableOnline), [invoices]);
  const chosen = payable.filter((invoice) => selected.includes(invoice.slug));
  const total = chosen.reduce((sum, invoice) => sum + Math.max(0, invoice.billAmount - invoice.paidAmount), 0);

  function toggle(slug: string) {
    setSelected((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  return (
    <>
      {gatewayEnabled && payable.length > 0 && (
        <div className="gateway-select-bar panel" role="region" aria-label="Pembayaran online">
          <div>
            <strong><CreditCard aria-hidden="true" /> Bayar online</strong>
            <p>{chosen.length ? `${chosen.length} tagihan dipilih · total ${rupiah(total)}` : "Centang tagihan yang ingin dibayar sekaligus lewat Virtual Account, QRIS, atau kartu kredit."}</p>
          </div>
          <div className="gateway-select-actions">
            <button type="button" className="outline-button" onClick={() => setSelected(selected.length === payable.length ? [] : payable.map((invoice) => invoice.slug))}>{selected.length === payable.length ? "Batal pilih semua" : "Pilih semua"}</button>
            {chosen.length ? <Link className="primary-button" href={checkoutHref(chosen.map((invoice) => invoice.slug), childQuery)}>Lanjut bayar <ArrowRight aria-hidden="true" /></Link> : <button type="button" className="primary-button" disabled>Lanjut bayar</button>}
          </div>
        </div>
      )}
      <div className="payment-tools panel">
        <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari jenis tagihan atau kode tagihan..." /></label>
        <select aria-label="Filter status pembayaran" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua status</option><option value="unpaid">Unpaid</option><option value="payment_submitted">Payment Submitted</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select>
      </div>
      <div className={`payment-list panel${gatewayEnabled ? " with-select" : ""}`}>
        <div className="payment-row payment-row-head">{gatewayEnabled && <span aria-hidden="true" />}<span>Jenis Tagihan</span><span>Jumlah</span><span>Jatuh tempo</span><span>Status</span><span /></div>
        {filtered.map((invoice) => {
          const selectable = gatewayEnabled && isPayableOnline(invoice);
          return (
            <div className={`payment-row${selected.includes(invoice.slug) ? " is-selected" : ""}`} key={invoice.slug}>
              {gatewayEnabled && (
                <span className="payment-row-check">
                  {selectable ? <input type="checkbox" aria-label={`Pilih ${invoice.feeType} ${invoice.month} untuk dibayar online`} checked={selected.includes(invoice.slug)} onChange={() => toggle(invoice.slug)} /> : null}
                </span>
              )}
              <Link className="payment-row-link" href={`/dashboard/payments/${invoice.slug}${childQuery}`}>
                <strong>{invoice.feeType}<small>{invoice.month}</small></strong>
                <span>{invoicePaymentState(invoice) === "paid" ? "Lunas" : invoice.amount}</span>
                <span>{invoice.dueDate}</span>
                <span className="payment-row-status">
                  <span className={`status-badge ${invoice.statusTone}`}>{invoice.status}</span>
                  {invoice.pendingGatewayPayment && <small className="gateway-pending-tag">Menunggu pembayaran online</small>}
                </span>
                <ArrowRight />
              </Link>
            </div>
          );
        })}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Tagihan tidak ditemukan</h2><p>Ubah pencarian atau filter status.</p></div>}
    </>
  );
}
