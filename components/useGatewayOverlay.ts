"use client";

import { useEffect, useMemo, useState } from "react";
import type { Invoice } from "@/lib/data";
import { gatewayMode, type PendingGatewayPayment } from "@/lib/gateway";

type DummyState = { pending: Record<string, PendingGatewayPayment>; paid: Set<string> };

/**
 * In dummy gateway mode the simulated checkouts live in the browser, so the
 * server-rendered invoices cannot know which bills are locked or already paid
 * online. This hook overlays that state; with the real API it returns the
 * invoices untouched because the payload already carries `pending_gateway_payment`.
 */
export function useGatewayOverlay(invoices: readonly Invoice[]): Invoice[] {
  const [dummyState, setDummyState] = useState<DummyState | null>(null);

  useEffect(() => {
    if (gatewayMode() !== "dummy") return;
    let cancelled = false;
    void import("@/lib/gatewayDummy").then(({ dummyPendingByInvoice, dummyPaidInvoices }) => {
      if (!cancelled) setDummyState({ pending: dummyPendingByInvoice(), paid: dummyPaidInvoices() });
    });
    return () => { cancelled = true; };
  }, [invoices]);

  return useMemo(() => {
    if (!dummyState) return [...invoices];
    return invoices.map((invoice) => {
      if (dummyState.paid.has(invoice.slug) && invoice.paidAmount < invoice.billAmount) {
        return { ...invoice, status: "Paid", statusTone: "success", paidAmount: invoice.billAmount, method: "Pembayaran online", payableViaGateway: false, pendingGatewayPayment: undefined, paymentSubmitted: false, rejectionReason: undefined };
      }
      const lock = dummyState.pending[invoice.slug];
      return lock ? { ...invoice, payableViaGateway: false, pendingGatewayPayment: lock } : invoice;
    });
  }, [invoices, dummyState]);
}
