// In-browser simulation of the gateway endpoints while the backend is being
// prepared. State lives in sessionStorage so checkout → instructions → paid
// survives navigation within the tab. Never used when
// NEXT_PUBLIC_PAYMENT_GATEWAY_MODE is not "dummy".
import type { ChannelQuery, CheckoutRequest, GatewayChannel, GatewayChannelsResponse, GatewayPayment, PendingGatewayPayment } from "@/lib/gateway";

const STORAGE_KEY = "classping.gateway.dummy";

// Mirrors GATEWAY_CHANNELS in the proposal (sample rates).
const CHANNELS = [
  { code: "VABNI", name: "BNI Virtual Account", method: "virtual_account", feeType: "flat", fee: 4000, min: 10000, max: null },
  { code: "VABCA", name: "BCA Virtual Account", method: "virtual_account", feeType: "flat", fee: 4000, min: 10000, max: null },
  { code: "VABRI", name: "BRI Virtual Account", method: "virtual_account", feeType: "flat", fee: 4000, min: 10000, max: null },
  { code: "VAMANDIRI", name: "Mandiri Virtual Account", method: "virtual_account", feeType: "flat", fee: 4000, min: 10000, max: null },
  { code: "VAPERMATA", name: "Permata Virtual Account", method: "virtual_account", feeType: "flat", fee: 4000, min: 10000, max: null },
  { code: "QRIS", name: "QRIS", method: "qris", feeType: "percent", fee: 0.7, min: 1000, max: 10_000_000 },
  { code: "CC", name: "Kartu Kredit", method: "credit_card", feeType: "percent", fee: 3.0, min: 10000, max: 100_000_000 },
] as const;

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
  return channel.feeType === "flat" ? channel.fee : Math.round((total * channel.fee) / 100);
}

/** Channels valid for this total: those whose grand total sits inside the method's min/max. */
export function channelsForTotal(total: number): GatewayChannel[] {
  return CHANNELS.flatMap((channel) => {
    const fee = feeFor(channel, total);
    const amount = total + fee;
    if (amount < channel.min || (channel.max !== null && amount > channel.max)) return [];
    return [{ code: channel.code, name: channel.name, payment_method: channel.method, transaction_fee: money(fee), amount: money(amount) }];
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
  return { branch_id: 1, invoice_total: money(query.invoiceTotal), channels: channelsForTotal(query.invoiceTotal), deadline_date: deadlineFor().deadline_date };
}

function expireStale(store: Store, now = Date.now()) {
  for (const payment of store.payments) {
    if (payment.status === "pending" && Date.parse(payment.expires_at) <= now) payment.status = "expired";
  }
}

export async function dummyCheckout(request: CheckoutRequest): Promise<GatewayPayment> {
  await pause();
  const store = read();
  expireStale(store);
  const existing = store.payments.find((payment) => payment.payment_no.endsWith(request.idempotencyKey.slice(0, 8)));
  if (existing) return existing;
  const locked = request.invoiceIds.find((id) => store.payments.some((payment) => payment.status === "pending" && payment.items.some((item) => String(item.student_invoice_id) === id)));
  if (locked) { const error = new Error("Ada tagihan yang sedang menunggu pembayaran online lain. Selesaikan atau tunggu sampai kedaluwarsa.") as Error & { code?: string }; error.code = "INVOICE_LOCKED"; throw error; }
  const items = request.items || request.invoiceIds.map((id) => ({ student_invoice_id: id, amount: "0.00" }));
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const channel = CHANNELS.find((item) => item.code === request.channel);
  if (!channel) { const error = new Error("Metode pembayaran ini tidak tersedia untuk jumlah tagihan tersebut.") as Error & { code?: string }; error.code = "CHANNEL_NOT_AVAILABLE"; throw error; }
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
    payment_code: channel.method === "virtual_account" ? `988${String(store.counter).padStart(5, "0")}${stamp.slice(2)}` : channel.method === "qris" ? `00020101021226610014ID.CO.RINTISAN.WWW0118936009${sequence}0215ID${stamp}${sequence}0303UMI5204829953033605802ID5909CLASSPING6007JAKARTA6304SIMU` : null,
    payment_link: channel.method === "credit_card" ? `https://sandbox.rintisan.co.id/pay/PAY-${stamp}-${sequence}` : null,
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

export async function dummyPayments(): Promise<GatewayPayment[]> {
  await pause(120);
  const store = read();
  expireStale(store);
  write(store);
  return store.payments;
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
