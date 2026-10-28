import type { ChildProfile, Invoice } from "@/lib/data";
import { invoicePaymentState } from "@/lib/payments";

export type PaymentReceipt = {
  /** Invoice reference shared with the verification email (INV-…). */
  reference: string;
  student: string;
  className: string;
  feeType: string;
  period: string;
  method: string;
  amount: string;
  paidAt: string;
  verifiedAt: string;
  downloadHref: string;
};

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

/**
 * Builds the verification receipt for a bill, or `null` while the bill is
 * not yet verified as paid. The receipt mirrors the "Pembayaran telah
 * diverifikasi" email so the page, the PDF and the inbox tell one story.
 */
export function paymentReceiptFor(
  invoice: Invoice,
  child: Pick<ChildProfile, "name" | "className">,
  studentId?: string,
): PaymentReceipt | null {
  if (invoicePaymentState(invoice) !== "paid") return null;
  const amount = invoice.paidAmount > 0 ? invoice.paidAmount : invoice.billAmount;
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
  return {
    reference: invoice.invoiceNo || `INV-${invoice.slug}`,
    student: child.name,
    className: child.className,
    feeType: invoice.feeType,
    period: invoice.month,
    method: invoice.method || "—",
    amount: rupiah(amount),
    paidAt: invoice.paidAt || "—",
    verifiedAt: invoice.verifiedAt && invoice.verifiedAt !== "—" ? invoice.verifiedAt : invoice.paidAt || "—",
    downloadHref: `/api/receipts/${encodeURIComponent(invoice.slug)}${query}`,
  };
}

export function receiptFileName(receipt: PaymentReceipt) {
  const safe = receipt.reference.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "tagihan";
  return `bukti-verifikasi-${safe}.pdf`;
}

/** Picks the guardian the school writes to: the primary link first, otherwise the first linked guardian with a name. */
export function primaryGuardianName(guardians: ReadonlyArray<{ guardian_name?: string; is_primary?: boolean }> = []) {
  const named = guardians.filter((item) => item.guardian_name?.trim());
  const chosen = named.find((item) => item.is_primary) ?? named[0];
  return chosen?.guardian_name?.trim() || undefined;
}
