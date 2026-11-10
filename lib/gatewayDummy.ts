// In-browser simulation of the gateway endpoints while the backend is being
// prepared. State lives in sessionStorage so checkout → instructions → paid
// survives navigation within the tab. Never used when
// NEXT_PUBLIC_PAYMENT_GATEWAY_MODE is not "dummy".
import type { ChannelQuery, CheckoutRequest, GatewayChannel, GatewayChannelsResponse, GatewayMethod, GatewayPayment, GatewayPaymentSummary, PendingGatewayPayment } from "@/lib/gateway";

const STORAGE_KEY = "classping.gateway.dummy";

/**
 * Mirrors the channel list returned by `GET gateway/channels` for a
 * Rp150.000 invoice total. Virtual accounts carry a flat fee; the other
 * channels scale their sample fee with the total.
 */
const SAMPLE_TOTAL = 150_000;
const CHANNELS: readonly { code: string; name: string; method: GatewayMethod; fee: number; scaled: boolean }[] = [
  { code: "VABCA", name: "BCA Virtual Account", method: "virtual_account", fee: 5000, scaled: false },
  { code: "VABRI", name: "BRI Virtual Account", method: "virtual_account", fee: 5000, scaled: false },
  { code: "VAMANDIRI", name: "Mandiri Virtual Account", method: "virtual_account", fee: 5000, scaled: false },
  { code: "VABNI", name: "BNI Virtual Account", method: "virtual_account", fee: 5000, scaled: false },
  { code: "VAPERMATA", name: "Permata Virtual Account", method: "virtual_account", fee: 5000, scaled: false },
  { code: "CC", name: "Kartu Kredit", method: "credit_card", fee: 3062, scaled: true },
  { code: "TOKOPEDIA CC", name: "Tokopedia (Kartu Kredit)", method: "e_commerce", fee: 2672, scaled: true },
  { code: "TOKOPEDIA NON CC", name: "Tokopedia", method: "e_commerce", fee: 754, scaled: true },
  { code: "BLIBLI CC", name: "Blibli (Kartu Kredit)", method: "e_commerce", fee: 2672, scaled: true },
];
const MIN_TOTAL = 10_000;

type Store = { payments: GatewayPayment[]; counter: number };

function read(): Store {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* sessionStorage unavailable: start empty */ }
  return { payments: [], counter: 500 };
}

function write(store: Store) {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

const money = (value: number) => value.toFixed(2);

export function feeFor(channel: (typeof CHANNELS)[number], total: number) {
  return channel.scaled ? Math.round((channel.fee * total) / SAMPLE_TOTAL) : channel.fee;
}

/** Channels valid for this total, priced like the real `gateway/channels` response. */
export function channelsForTotal(total: number): GatewayChannel[] {
  if (total < MIN_TOTAL) return [];
  return CHANNELS.map((channel) => {
    const fee = feeFor(channel, total);
    return { code: channel.code, name: channel.name, payment_method: channel.method, transaction_fee: money(fee), amount: money(total + fee) };
  });
}

/** End of the next day in WIB, matching GATEWAY_PAYMENT_DEADLINE_DAYS = 1. */
export function deadlineFor(now = new Date()) {
  const jakarta = new Date(now.getTime() + 7 * 3_600_000);
  const next = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate() + 1));
  const deadline_date = next.toISOString().slice(0, 10);
  const expires_at = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 23, 59, 59) - 7 * 3_600_000).toISOString();
  return { deadline_date, expires_at };
}

export async function dummyChannels(query: ChannelQuery): Promise<GatewayChannelsResponse> {
  await pause();
  const { expires_at } = deadlineFor();
  const payment_window_minutes = Math.max(1, Math.round((Date.parse(expires_at) - Date.now()) / 60_000));
  return { branch_id: 1, invoice_total: money(query.invoiceTotal), payment_window_minutes, expires_at, channels: channelsForTotal(query.invoiceTotal) };
}

function expireStale(store: Store, now = Date.now()) {
  for (const payment of store.payments) {
    if (payment.status === "pending" && Date.parse(payment.expires_at) <= now) payment.status = "expired";
  }
}

function gatewayError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

/** Stand-in for the provider's hosted page (card form / Tokopedia / Blibli). */
export function dummyProviderHref(payment: Pick<GatewayPayment, "id">) {
  return `/dashboard/payments/online/simulator?payment_id=${encodeURIComponent(String(payment.id))}`;
}

export async function dummyCheckout(request: CheckoutRequest): Promise<GatewayPayment> {
  await pause();
  const store = read();
  expireStale(store);
  const existing = store.payments.find((payment) => payment.payment_no.endsWith(request.idempotencyKey.slice(0, 8)));
  if (existing) return existing;
  const locked = request.invoiceIds.find((id) => store.payments.some((payment) => payment.status === "pending" && payment.items.some((item) => String(item.student_invoice_id) === id)));
  if (locked) throw gatewayError("INVOICE_LOCKED", "Ada tagihan yang sedang menunggu pembayaran online lain. Selesaikan atau tunggu sampai kedaluwarsa.");
  const items = request.items || request.invoiceIds.map((id) => ({ student_invoice_id: id, amount: "0.00" }));
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const channel = CHANNELS.find((item) => item.code === request.channel);
  if (!channel || total < MIN_TOTAL) throw gatewayError("CHANNEL_NOT_AVAILABLE", "Metode pembayaran ini tidak tersedia untuk jumlah tagihan tersebut.");
  const fee = feeFor(channel, total);
  const { expires_at } = deadlineFor();
  store.counter += 1;
  const sequence = String(store.counter).padStart(6, "0");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const payment: GatewayPayment = {
    id: store.counter,
    payment_no: `PAY-${stamp}-${sequence}-${request.idempotencyKey.slice(0, 8)}`,
    status: "pending",
    branch_id: 1,
    channel_code: channel.code,
    channel_name: channel.name,
    payment_method: channel.method,
    invoice_total: money(total),
    transaction_fee: money(fee),
    platform_fee: "0.00",
    amount: money(total + fee),
    payment_code: channel.method === "virtual_account" ? `988${String(store.counter).padStart(5, "0")}${stamp.slice(2)}` : null,
    payment_link: channel.method === "virtual_account" ? null : dummyProviderHref({ id: store.counter }),
    expires_at,
    created_at: new Date().toISOString(),
    paid_at: null,
    items,
  };
  store.payments.unshift(payment);
  write(store);
  return payment;
}

export async function dummyPayment(id: number | string): Promise<GatewayPayment | null> {
  await pause(120);
  const store = read();
  expireStale(store);
  write(store);
  return store.payments.find((payment) => String(payment.id) === String(id)) || null;
}

/** Like `GET gateway/payments/`: summaries with `invoice_count`, without items or instructions. */
export async function dummyPayments(): Promise<GatewayPaymentSummary[]> {
  await pause(120);
  const store = read();
  expireStale(store);
  write(store);
  return store.payments.map((payment) => ({
    id: payment.id, payment_no: payment.payment_no, status: payment.status, channel_code: payment.channel_code,
    channel_name: payment.channel_name, payment_method: payment.payment_method, invoice_total: payment.invoice_total,
    transaction_fee: payment.transaction_fee, amount: payment.amount, expires_at: payment.expires_at,
    created_at: payment.created_at, paid_at: payment.paid_at, invoice_count: payment.items.length,
  }));
}

/** Simulates `POST gateway/payments/{id}/cancel`: only a pending checkout can be abandoned. */
export async function dummyCancel(id: number | string): Promise<GatewayPayment> {
  await pause(200);
  const store = read();
  expireStale(store);
  const payment = store.payments.find((item) => String(item.id) === String(id));
  if (!payment) throw gatewayError("NOT_FOUND", "Pembayaran tidak ditemukan.");
  if (payment.status !== "pending") throw gatewayError("PAYMENT_NOT_PENDING", "Pembayaran ini sudah selesai, kedaluwarsa, atau dibatalkan sehingga tidak dapat dibatalkan lagi.");
  payment.status = "cancelled";
  write(store);
  return payment;
}

/** Simulates the Rintisan payment callback for a pending checkout. */
export function dummyMarkPaid(id: number | string) {
  const store = read();
  const payment = store.payments.find((item) => String(item.id) === String(id));
  if (payment && payment.status === "pending") {
    payment.status = "paid";
    payment.paid_at = new Date().toISOString();
    write(store);
  }
  return payment || null;
}

/** Invoices currently locked by a pending checkout, keyed by invoice id. */
export function dummyPendingByInvoice(): Record<string, PendingGatewayPayment> {
  const store = read();
  expireStale(store);
  const map: Record<string, PendingGatewayPayment> = {};
  for (const payment of store.payments) {
    if (payment.status !== "pending") continue;
    for (const item of payment.items) {
      map[String(item.student_invoice_id)] = { id: payment.id, paymentNo: payment.payment_no, channelName: payment.channel_name, paymentMethod: payment.payment_method, expiresAt: payment.expires_at };
    }
  }
  return map;
}

/** Invoices already settled through a simulated checkout, keyed by invoice id. */
export function dummyPaidInvoices(): Set<string> {
  const store = read();
  return new Set(store.payments.filter((payment) => payment.status === "paid").flatMap((payment) => payment.items.map((item) => String(item.student_invoice_id))));
}

function pause(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, typeof window === "undefined" ? 0 : ms));
}
