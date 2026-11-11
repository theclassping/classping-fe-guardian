// Payment gateway (Rintisan) flow for guardians, against the backend's payment_gateway app:
//   GET  /api/gateway/invoices?student_id=…   → which invoices can be paid online / are locked (read in lib/backend.ts)
//   GET  /api/gateway/channels?invoice_ids=…  → channels with fee + total per method
//   POST /api/gateway/checkout {invoice_ids, channel} → payment instructions
//   GET  /api/gateway/payments, /api/gateway/payments/{id} → history + polling
//   POST /api/gateway/payments/{id}/cancel → guardian abandons a pending checkout
// The manual proof-upload flow stays untouched; this module only adds the
// online option for branches with `is_payment_gateway_enabled`.
import { records } from "@/lib/records";
import { proxyUrl } from "@/lib/routes";

export type GatewayMethod = "virtual_account" | "credit_card" | "e_commerce" | "qris";
/** `failed`: the provider could not create the billing, so the parent never received payment instructions. */
export type GatewayStatus = "pending" | "paid" | "expired" | "cancelled" | "failed";

export type GatewayChannel = {
  code: string;
  name: string;
  payment_method: GatewayMethod;
  transaction_fee: string;
  amount: string;
};

/** `GET gateway/channels/` (backend CheckoutQuoteSerializer). */
export type GatewayChannelsResponse = {
  student_id?: number;
  branch_id?: number;
  invoice_ids?: number[];
  invoice_total: string;
  /** How long payment instructions stay valid once the checkout is created. */
  payment_window_minutes: number;
  expires_at: string;
  channels: GatewayChannel[];
};

export type GatewayPaymentItem = {
  student_invoice_id: number | string;
  invoice_no?: string;
  student_name?: string;
  fee_type?: string;
  amount: string;
};

/** A row of `GET gateway/payments/` (backend GatewayPaymentSummarySerializer): no instructions and no items. */
export type GatewayPaymentSummary = {
  id: number | string;
  payment_no: string;
  status: GatewayStatus;
  student_id?: number;
  student_name?: string;
  channel_code: string;
  channel_name?: string;
  payment_method: GatewayMethod;
  invoice_total: string;
  transaction_fee: string;
  amount: string;
  expires_at: string;
  created_at?: string;
  paid_at?: string | null;
  invoice_count: number;
  /** Paid after the invoice was already settled another way; the school refunds the parent. */
  needs_refund?: boolean;
};

/** `GET gateway/payments/{id}/` and `POST gateway/checkout/` (backend GatewayPaymentDetailSerializer). */
export type GatewayPayment = Omit<GatewayPaymentSummary, "invoice_count"> & {
  branch_id?: number;
  platform_fee?: string;
  payment_code: string | null;
  payment_link: string | null;
  items: GatewayPaymentItem[];
};

/** Summary of a checkout that still locks an invoice (from `pending_gateway_payment`). */
export type PendingGatewayPayment = {
  id: number | string;
  paymentNo?: string;
  channelName?: string;
  paymentMethod?: GatewayMethod;
  expiresAt?: string;
};

export type GatewayError = Error & { code?: string };

export const GATEWAY_ERROR_MESSAGES: Record<string, string> = {
  GATEWAY_DISABLED: "Sekolah belum mengaktifkan pembayaran online.",
  INVOICE_NOT_PAYABLE: "Ada tagihan yang sudah lunas atau sedang diverifikasi secara manual.",
  INVOICE_LOCKED: "Ada tagihan yang sedang menunggu pembayaran online lain. Selesaikan atau tunggu sampai kedaluwarsa.",
  MIXED_BRANCH: "Tagihan yang dipilih berasal dari cabang sekolah yang berbeda.",
  CHANNEL_NOT_AVAILABLE: "Metode pembayaran ini tidak tersedia untuk jumlah tagihan tersebut.",
  PAYER_PHONE_INVALID: "Nomor HP wali belum terisi atau tidak valid. Perbarui nomor HP di profil Anda.",
  PROVIDER_UNAVAILABLE: "Layanan pembayaran sedang tidak dapat dihubungi. Silakan coba lagi.",
  PAYMENT_NOT_PENDING: "Pembayaran ini sudah selesai, kedaluwarsa, atau dibatalkan sehingga tidak dapat dibatalkan lagi.",
  PAYMENT_NOT_CANCELLABLE: "Pembayaran ini tidak dapat dibatalkan. Tunggu sampai batas waktu berakhir.",
};

export const METHOD_LABELS: Record<GatewayMethod, string> = {
  virtual_account: "Virtual Account",
  credit_card: "Kartu Kredit",
  e_commerce: "E-Commerce",
  qris: "QRIS",
};

/** Methods completed on the provider's or another app's page, after which the parent is sent back to the return page. */
export function isExternalMethod(method: GatewayMethod) {
  return method === "credit_card" || method === "e_commerce";
}

export const STATUS_LABELS: Record<GatewayStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal dibuat",
};

const STATUS_TONES: Record<GatewayStatus, "warning" | "success" | "late" | "partial"> = {
  pending: "warning",
  paid: "success",
  expired: "late",
  cancelled: "partial",
  failed: "late",
};

export function statusTone(status: GatewayStatus) {
  return STATUS_TONES[status];
}

/** Channels grouped by method, in the order shown to the parent. */
export function groupChannels(channels: readonly GatewayChannel[]) {
  const order: GatewayMethod[] = ["virtual_account", "credit_card", "e_commerce", "qris"];
  return order
    .map((method) => ({ method, label: METHOD_LABELS[method], channels: channels.filter((channel) => channel.payment_method === method) }))
    .filter((group) => group.channels.length > 0);
}

export function isExpired(payment: Pick<GatewayPayment, "status" | "expires_at">, now = new Date()) {
  return payment.status === "expired" || (payment.status === "pending" && Date.parse(payment.expires_at) <= now.getTime());
}

/** Human duration such as "1 hari 3 jam", "2 jam 5 menit" or "45 menit"; empty for zero or less. */
export function durationLabel(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "";
  const minutes = Math.floor(totalMinutes);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return mins ? `${hours} jam ${mins} menit` : `${hours} jam`;
  return `${Math.max(1, mins)} menit`;
}

/** Countdown to `expiresAt`; empty once passed. */
export function timeLeft(expiresAt: string, now = new Date()) {
  const ms = Date.parse(expiresAt) - now.getTime();
  return ms > 0 ? durationLabel(Math.max(1, Math.floor(ms / 60_000))) : "";
}

export function parseInvoiceIds(value?: string | string[] | null): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value || "";
  return Array.from(new Set(raw.split(",").map((part) => part.trim()).filter(Boolean)));
}

export function checkoutHref(invoiceIds: readonly string[], childQuery = "") {
  const params = new URLSearchParams(childQuery.replace(/^\?/, ""));
  params.set("invoices", invoiceIds.join(","));
  return `/dashboard/payments/checkout?${params}`;
}

export function gatewayPaymentHref(id: number | string, childQuery = "") {
  return `/dashboard/payments/online/${encodeURIComponent(String(id))}${childQuery}`;
}

/** Landing page the provider (or an e-commerce app) sends the parent back to after paying. */
export function gatewayReturnHref(payment: Pick<GatewayPayment, "id" | "payment_no">, origin = "") {
  return `${origin}/dashboard/payments/online/return?payment_id=${encodeURIComponent(String(payment.id))}&payment_no=${encodeURIComponent(payment.payment_no)}`;
}

/** Reads whichever reference the provider put in the return URL. */
export function returnReference(params: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => { const value = params[key]; return (Array.isArray(value) ? value[0] : value)?.trim() || undefined; };
  return { id: pick("payment_id") || pick("id"), paymentNo: pick("payment_no") || pick("reference_id") || pick("order_id") || pick("trx_id") };
}

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { detail?: string; code?: string };
  const code = payload.code || (payload.detail && GATEWAY_ERROR_MESSAGES[payload.detail] ? payload.detail : undefined);
  const error: GatewayError = new Error((code && GATEWAY_ERROR_MESSAGES[code]) || payload.detail || fallback);
  error.code = code;
  throw error;
}

/** Browser → backend through the app's /api/proxy route, which adds the session token. */
async function gatewayRequest(path: string, init: RequestInit = {}) {
  return fetch(proxyUrl(path), { credentials: "include", cache: "no-store", ...init });
}

export async function fetchChannels(invoiceIds: readonly string[]): Promise<GatewayChannelsResponse> {
  const response = await gatewayRequest(`gateway/channels?invoice_ids=${encodeURIComponent(invoiceIds.join(","))}`);
  if (!response.ok) await readError(response, "Metode pembayaran tidak dapat dimuat.");
  return response.json();
}

export type CheckoutRequest = { invoiceIds: readonly string[]; channel: string; idempotencyKey: string };

export async function createCheckout(request: CheckoutRequest): Promise<GatewayPayment> {
  const response = await gatewayRequest("gateway/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": request.idempotencyKey },
    body: JSON.stringify({ invoice_ids: request.invoiceIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id)), channel: request.channel }),
  });
  if (!response.ok) await readError(response, "Pembayaran online tidak dapat dibuat.");
  return response.json();
}

export async function fetchGatewayPayment(id: number | string): Promise<GatewayPayment | null> {
  const response = await gatewayRequest(`gateway/payments/${encodeURIComponent(String(id))}`);
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) await readError(response, "Status pembayaran tidak dapat dimuat.");
  return response.json();
}

export async function fetchGatewayPayments(studentId?: string): Promise<GatewayPaymentSummary[]> {
  const response = await gatewayRequest(`gateway/payments${studentId ? `?student_id=${encodeURIComponent(studentId)}` : ""}`);
  if (!response.ok) await readError(response, "Riwayat pembayaran online tidak dapat dimuat.");
  return records<GatewayPaymentSummary>(await response.json());
}

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function cancelGatewayPayment(id: number | string): Promise<GatewayPayment> {
  const response = await gatewayRequest(`gateway/payments/${encodeURIComponent(String(id))}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" } });
  if (!response.ok) await readError(response, "Pembayaran tidak dapat dibatalkan.");
  return response.json();
}

/** Finds a payment by its number, for return URLs that carry only `payment_no`. */
export async function findGatewayPaymentByNo(paymentNo: string): Promise<GatewayPaymentSummary | null> {
  const payments = await fetchGatewayPayments();
  return payments.find((payment) => payment.payment_no === paymentNo) || null;
}
