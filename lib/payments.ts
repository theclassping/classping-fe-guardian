import type { Invoice } from "@/lib/data";

export type ApiPaymentProof = {
  id?: number;
  uploaded_at?: string;
  image_url?: string;
  url?: string;
  image_data?: { image_url?: string; url?: string };
};

export type ApiPayment = {
  id?: number;
  amount?: string;
  payment_method?: string;
  submitted_at?: string;
  paid_at?: string;
  verified_at?: string;
  payment_date?: string;
  created_at?: string;
  status?: string;
  payment_status?: string;
  rejection_reason?: string | null;
  proofs?: ApiPaymentProof[];
};

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

export function isVerifiedPayment(payment?: ApiPayment) {
  return ["completed", "verified", "approved", "paid"].includes(normalizedStatus(payment?.status || payment?.payment_status));
}

export function latestPayment(payments: ApiPayment[] = []) {
  return payments.reduce<ApiPayment | undefined>((latest, payment) => {
    const timestamp = (item: ApiPayment) => Date.parse(item.submitted_at || item.created_at || "") || 0;
    return !latest || timestamp(payment) > timestamp(latest) ||
      (timestamp(payment) === timestamp(latest) && (payment.id || 0) > (latest.id || 0)) ? payment : latest;
  }, undefined);
}

export function verifiedPaymentProofUrl(payment?: ApiPayment) {
  if (!isVerifiedPayment(payment)) return undefined;
  const proof = payment?.proofs?.reduce<ApiPaymentProof | undefined>((latest, item) => {
    const timestamp = (value: ApiPaymentProof) => Date.parse(value.uploaded_at || "") || 0;
    return !latest || timestamp(item) > timestamp(latest) ||
      (timestamp(item) === timestamp(latest) && (item.id || 0) > (latest.id || 0)) ? item : latest;
  }, undefined);
  return proof?.image_url || proof?.url || proof?.image_data?.image_url || proof?.image_data?.url;
}

export async function submitPaymentProof(invoice: Invoice, method: string, imageData: { object_key: string; original_name: string }) {
  const retry = Boolean(invoice.paymentId);
  const response = await fetch(retry ? "/api/proxy/payment-proofs/" : "/api/proxy/payments/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(retry
      ? { payment_id: invoice.paymentId, image_data: imageData }
      : { student_invoice_id: Number(invoice.slug), amount: Math.max(0, invoice.billAmount - invoice.paidAmount).toFixed(2), payment_method: method, proofs: [{ image_data: imageData }] }),
  });
  const payload = await response.json().catch(() => ({})) as { detail?: string };
  if (!response.ok) throw new Error(payload.detail || "Pembayaran tidak dapat dikirim.");

  if (retry && method !== invoice.paymentMethod) {
    const methodResponse = await fetch(`/api/proxy/payments/${invoice.paymentId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_method: method }),
    });
    const methodPayload = await methodResponse.json().catch(() => ({})) as { detail?: string };
    if (!methodResponse.ok) throw new Error(methodPayload.detail || "Metode pembayaran tidak dapat diperbarui.");
  }
}
