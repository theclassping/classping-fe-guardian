import { proxyUrl } from "@/lib/routes";
import type { ApiPayment, Invoice } from "@/features/payments/types";

function normalizedStatus(status?: string) {
  return (status || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function invoicePaymentState(invoice: Pick<Invoice, "status" | "billAmount" | "paidAmount">) {
  const status = normalizedStatus(invoice.status);
  if (["unpaid", "overdue", "rejected"].includes(status)) return "unpaid";
  if (["payment_submitted", "submitted"].includes(status)) return "submitted";
  if (["paid", "paid_full", "completed", "verified", "approved", "lunas"].includes(status)) return "paid";
  return invoice.billAmount > 0 && invoice.paidAmount >= invoice.billAmount ? "paid" : "unpaid";
}

/** Amount still open on a bill (never negative). */
export function remainingAmount(invoice: Pick<Invoice, "billAmount" | "paidAmount">) {
  return Math.max(0, invoice.billAmount - invoice.paidAmount);
}

export function totalRemaining(invoices: readonly Pick<Invoice, "billAmount" | "paidAmount">[]) {
  return invoices.reduce((sum, invoice) => sum + remainingAmount(invoice), 0);
}

/** An open bill that is not locked by another online checkout nor waiting for manual verification. */
export function isPayableOnline(invoice: Invoice) {
  return invoicePaymentState(invoice) === "unpaid" && remainingAmount(invoice) > 0 && invoice.payableViaGateway !== false && !invoice.pendingGatewayPayment;
}

export function isVerifiedPayment(payment?: ApiPayment) {
  return ["completed", "verified", "approved", "paid"].includes(normalizedStatus(payment?.status || payment?.payment_status));
}

/** The record with the newest timestamp; the higher id wins a tie. */
function newestRecord<T extends { id?: number }>(items: readonly T[] = [], timestamp: (item: T) => string | undefined) {
  const time = (item: T) => Date.parse(timestamp(item) || "") || 0;
  return items.reduce<T | undefined>((latest, item) =>
    !latest || time(item) > time(latest) || (time(item) === time(latest) && (item.id || 0) > (latest.id || 0)) ? item : latest,
  undefined);
}

export function latestPayment(payments: ApiPayment[] = []) {
  return newestRecord(payments, (payment) => payment.submitted_at || payment.created_at);
}

export function verifiedPaymentProofUrl(payment?: ApiPayment) {
  if (!isVerifiedPayment(payment)) return undefined;
  const proof = newestRecord(payment?.proofs, (item) => item.uploaded_at);
  return proof?.image_url || proof?.url || proof?.image_data?.image_url || proof?.image_data?.url;
}

export async function submitPaymentProof(invoice: Invoice, method: string, imageData: { object_key: string; original_name: string }) {
  const retry = Boolean(invoice.paymentId);
  const response = await fetch(proxyUrl(retry ? "payment-proofs" : "payments"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(retry
      ? { payment_id: invoice.paymentId, image_data: imageData }
      : { student_invoice_id: Number(invoice.slug), amount: remainingAmount(invoice).toFixed(2), payment_method: method, proofs: [{ image_data: imageData }] }),
  });
  const payload = await response.json().catch(() => ({})) as { detail?: string };
  if (!response.ok) throw new Error(payload.detail || "Pembayaran tidak dapat dikirim.");

  if (retry && method !== invoice.paymentMethod) {
    const methodResponse = await fetch(proxyUrl(`payments/${invoice.paymentId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_method: method }),
    });
    const methodPayload = await methodResponse.json().catch(() => ({})) as { detail?: string };
    if (!methodResponse.ok) throw new Error(methodPayload.detail || "Metode pembayaran tidak dapat diperbarui.");
  }
}
