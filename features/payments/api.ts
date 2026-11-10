// The selected child's bills, read on the server.
import { formatDateTime, formatLongDate, formatMonthYear, rupiah, titleize } from "@/lib/format";
import { positiveId, records, recordsOrNull } from "@/lib/records";
import { get, getWithStatus } from "@/lib/server-api";
import { invoicePaymentState, isVerifiedPayment, latestPayment, remainingAmount, verifiedPaymentProofUrl } from "@/features/payments/helpers";
import type { ApiInvoice, ApiPayableInvoice, ApiPayment, Invoice } from "@/features/payments/types";

/** Badge colour for an invoice status from the backend. */
function statusTone(value?: string): Invoice["statusTone"] {
  const normalized = String(value || "").toLowerCase();
  if (["paid", "paid_full", "verified", "approved", "completed", "lunas"].includes(normalized)) return "success";
  if (["partial", "partially_paid", "sebagian"].some((status) => normalized.includes(status))) return "partial";
  if (["late", "overdue", "terlambat"].some((status) => normalized.includes(status))) return "late";
  return "warning";
}

function mapInvoice(item: ApiInvoice, payment = item.payment || latestPayment(item.payments)): Invoice {
  const billAmount = Number(item.total_amount || item.subtotal || 0);
  const paidAmount = Number(item.amount_paid || 0);
  const remaining = remainingAmount({ billAmount, paidAmount });
  const paid = paidAmount >= billAmount && billAmount > 0;
  const apiStatus = item.status;
  const state = invoicePaymentState({ status: apiStatus || "", billAmount, paidAmount });
  const verified = state === "paid" && isVerifiedPayment(payment);
  const rejected = state === "unpaid" && payment?.status === "rejected";
  const paymentDate = state === "paid" ? item.paid_at || item.payment_date || payment?.paid_at || payment?.payment_date : undefined;
  const paymentDateTime = (value?: string) => formatDateTime(value, { zoneName: false });
  const money = (value: number) => rupiah(value, item.currency || "IDR");
  return {
    slug: String(item.id ?? item.invoice_no ?? "invoice"),
    month: formatMonthYear(item.invoice_date, item.invoice_no || "Tagihan"),
    feeType: item.fee_type?.name?.trim() || item.fee_type_name?.trim() || "Biaya sekolah",
    amount: money(remaining),
    billAmount,
    paidAmount,
    dueDate: formatLongDate(item.due_date, "Belum tersedia"),
    status: apiStatus ? titleize(apiStatus) : paid ? "Lunas" : paidAmount > 0 ? `Sebagian · sisa ${money(remaining)}` : "Menunggu pembayaran",
    statusTone: apiStatus ? statusTone(apiStatus) : paid ? "success" : paidAmount > 0 ? "partial" : "warning",
    method: titleize(item.payment_method || payment?.payment_method),
    paidAt: paymentDateTime(paymentDate),
    fine: "Tidak ada",
    paymentSubmitted: state === "submitted",
    paymentId: payment?.id,
    paymentMethod: payment?.payment_method,
    rejectionReason: rejected ? payment.rejection_reason || "Bukti pembayaran belum dapat diverifikasi." : undefined,
    verifiedAt: verified ? paymentDateTime(payment?.verified_at || paymentDate) : "—",
    proofUrl: verified ? verifiedPaymentProofUrl(payment) : undefined,
    invoiceNo: item.invoice_no?.trim() || undefined,
    invoiceDate: item.invoice_date || item.created_at,
    studentId: item.student_id,
    // Refined by GET gateway/invoices (withGatewayPayability), which also knows about locks.
    payableViaGateway: state === "unpaid",
  };
}

type GatewayPayability = Map<string, ApiPayableInvoice>;

/**
 * Online-payment state of the student's invoices, keyed by invoice id: whether each one can be
 * paid online and which pending checkout locks it. The invoice endpoints do not carry this.
 * `null` when it could not be read; the bills then keep their own state and the backend still
 * rejects a locked invoice at checkout.
 */
async function gatewayPayabilityFor(studentId?: number): Promise<GatewayPayability | null> {
  if (!studentId) return null;
  const payload = await get<{ invoices?: ApiPayableInvoice[] }>(`/api/gateway/invoices/?student_id=${studentId}`);
  if (!Array.isArray(payload?.invoices)) return null;
  return new Map(payload.invoices.filter((row) => row.id != null).map((row) => [String(row.id), row]));
}

function withGatewayPayability(invoice: Invoice, payability: GatewayPayability | null): Invoice {
  const row = payability?.get(invoice.slug);
  if (!row) return invoice;
  return {
    ...invoice,
    payableViaGateway: row.payable === true,
    pendingGatewayPayment: row.active_gateway_payment_id
      ? { id: row.active_gateway_payment_id, expiresAt: row.locked_until || undefined }
      : undefined,
  };
}

/** The child's bills (raw), or `null` when the backend could not be read. Shared by the bill list and the notifications. */
export async function studentInvoicesFor(studentId?: number) {
  const items = recordsOrNull<ApiInvoice>(await get(studentId ? `/api/student-invoices/?student_id=${studentId}` : "/api/student-invoices/"));
  return items && items.filter((item) => !studentId || Number(item.student_id) === studentId);
}

/** Resolves to the child's bills, or `null` when the backend could not be read (expired session, outage). */
export async function invoicesForBackend(studentId?: number): Promise<Invoice[] | null> {
  const [items, payability] = await Promise.all([studentInvoicesFor(studentId), gatewayPayabilityFor(studentId)]);
  return items && items.map((item) => withGatewayPayability(mapInvoice(item), payability));
}

export type InvoiceLookup =
  | { state: "found"; invoice: Invoice }
  /** The backend answered and the bill does not exist (or is not this guardian's). */
  | { state: "missing" }
  /** The backend could not be reached or rejected the session; the bill may still exist. */
  | { state: "unavailable" };

export async function invoiceLookupForBackend(invoiceId: string): Promise<InvoiceLookup> {
  const { status, data: item } = await getWithStatus<ApiInvoice | { results?: ApiInvoice[] }>(`/api/student-invoices/${encodeURIComponent(invoiceId)}/`);
  const record: ApiInvoice | undefined = item && typeof item === "object" && "results" in item ? item.results?.[0] : item as ApiInvoice | null || undefined;
  if (!record) return status === 404 || status === 403 ? { state: "missing" } : { state: "unavailable" };
  const [paymentPayload, payability] = await Promise.all([
    get(`/api/payments/?student_invoice_id=${encodeURIComponent(invoiceId)}`),
    gatewayPayabilityFor(positiveId(record.student_id)),
  ]);
  const payment = latestPayment(records<ApiPayment>(paymentPayload));
  const invoice = payment ? mapInvoice(record, payment) : mapInvoice(record);
  return { state: "found", invoice: withGatewayPayability(invoice, payability) };
}

export async function invoiceForBackend(invoiceId: string) {
  const lookup = await invoiceLookupForBackend(invoiceId);
  return lookup.state === "found" ? lookup.invoice : undefined;
}
