// Payment gateway (Rintisan) flow for guardians, as specified in the
// "Proposal Payment Gateway & Penarikan Dana" (draft v5, 7 Nov 2026):
//   GET  /api/gateway/channels?invoice_ids=…  → channels with fee + total per method
//   POST /api/gateway/checkout {invoice_ids, channel} → payment instructions
//   GET  /api/gateway/payments, /api/gateway/payments/{id} → history + polling
// The manual proof-upload flow stays untouched; this module only adds the
// online option for branches with `is_payment_gateway_enabled`.
//
// While the backend is being prepared, NEXT_PUBLIC_PAYMENT_GATEWAY_MODE=dummy
// routes every call to the in-browser simulation in `gatewayDummy.ts`.

export type GatewayMethod = "virtual_account" | "qris" | "credit_card";
export type GatewayStatus = "pending" | "paid" | "expired";

export type GatewayChannel = {
  code: string;
  name: string;
  payment_method: GatewayMethod;
  transaction_fee: string;
  amount: string;
};

export type GatewayChannelsResponse = {
  branch_id?: number;
  invoice_total: string;
  channels: GatewayChannel[];
  deadline_date: string;
};

export type GatewayPaymentItem = {
  student_invoice_id: number | string;
  invoice_no?: string;
  student_name?: string;
  fee_type?: string;
  amount: string;
};

export type GatewayPayment = {
  id: number | string;
  payment_no: string;
  status: GatewayStatus;
  branch_id?: number;
  channel_code: string;
  channel_name?: string;
  payment_method: GatewayMethod;
  invoice_total: string;
  transaction_fee: string;
  platform_fee?: string;
  amount: string;
  payment_code: string | null;
  payment_link: string | null;
  expires_at: string;
  created_at?: string;
  paid_at?: string | null;
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
};

export function gatewayMode(): "api" | "dummy" {
  return process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_MODE === "dummy" ? "dummy" : "api";
}

export function rupiah(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export const METHOD_LABELS: Record<GatewayMethod, string> = {
  virtual_account: "Virtual Account",
  qris: "QRIS",
  credit_card: "Kartu Kredit",
};

export const STATUS_LABELS: Record<GatewayStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  expired: "Kedaluwarsa",
};

export function statusTone(status: GatewayStatus): "warning" | "success" | "late" {
  return status === "paid" ? "success" : status === "expired" ? "late" : "warning";
}

/** Channels grouped by method, in the order shown to the parent. */
export function groupChannels(channels: readonly GatewayChannel[]) {
  const order: GatewayMethod[] = ["virtual_account", "qris", "credit_card"];
  return order
    .map((method) => ({ method, label: METHOD_LABELS[method], channels: channels.filter((channel) => channel.payment_method === method) }))
    .filter((group) => group.channels.length > 0);
}

export function formatDateTime(value?: string | null, withTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" } : {}) }).format(date);
}

export function isExpired(payment: Pick<GatewayPayment, "status" | "expires_at">, now = new Date()) {
  return payment.status === "expired" || (payment.status === "pending" && Date.parse(payment.expires_at) <= now.getTime());
}

/** Human countdown such as "1 hari 3 jam" or "45 menit"; empty once passed. */
export function timeLeft(expiresAt: string, now = new Date()) {
  const ms = Date.parse(expiresAt) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${mins} menit`;
  return `${Math.max(1, mins)} menit`;
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

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({})) as { detail?: string; code?: string };
  const code = payload.code || (payload.detail && GATEWAY_ERROR_MESSAGES[payload.detail] ? payload.detail : undefined);
  const error: GatewayError = new Error((code && GATEWAY_ERROR_MESSAGES[code]) || payload.detail || fallback);
  error.code = code;
  throw error;
}

async function dummy() {
  return import("@/lib/gatewayDummy");
}

export type ChannelQuery = { invoiceIds: readonly string[]; invoiceTotal: number };

export async function fetchChannels(query: ChannelQuery): Promise<GatewayChannelsResponse> {
  if (gatewayMode() === "dummy") return (await dummy()).dummyChannels(query);
  const response = await fetch(`/api/proxy/gateway/channels/?invoice_ids=${encodeURIComponent(query.invoiceIds.join(","))}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) await readError(response, "Metode pembayaran tidak dapat dimuat.");
  return response.json();
}

export type CheckoutRequest = { invoiceIds: readonly string[]; channel: string; idempotencyKey: string; items?: GatewayPaymentItem[] };

export async function createCheckout(request: CheckoutRequest): Promise<GatewayPayment> {
  if (gatewayMode() === "dummy") return (await dummy()).dummyCheckout(request);
  const response = await fetch("/api/proxy/gateway/checkout/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "Idempotency-Key": request.idempotencyKey },
    body: JSON.stringify({ invoice_ids: request.invoiceIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id)), channel: request.channel }),
  });
  if (!response.ok) await readError(response, "Pembayaran online tidak dapat dibuat.");
  return response.json();
}

export async function fetchGatewayPayment(id: number | string): Promise<GatewayPayment | null> {
  if (gatewayMode() === "dummy") return (await dummy()).dummyPayment(id);
  const response = await fetch(`/api/proxy/gateway/payments/${encodeURIComponent(String(id))}/`, { credentials: "include", cache: "no-store" });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) await readError(response, "Status pembayaran tidak dapat dimuat.");
  return response.json();
}

export async function fetchGatewayPayments(studentId?: string): Promise<GatewayPayment[]> {
  if (gatewayMode() === "dummy") return (await dummy()).dummyPayments();
  const response = await fetch(`/api/proxy/gateway/payments/${studentId ? `?student_id=${encodeURIComponent(studentId)}` : ""}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) await readError(response, "Riwayat pembayaran online tidak dapat dimuat.");
  const payload = await response.json() as GatewayPayment[] | { results?: GatewayPayment[] };
  return Array.isArray(payload) ? payload : payload.results || [];
}

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
