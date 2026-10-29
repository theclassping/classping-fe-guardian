import type { Activity, Invoice } from "@/lib/data";
import { invoicePaymentState } from "@/lib/payments";

/** Time-of-day greeting in Indonesian, in the school's timezone. */
export function greetingFor(date = new Date(), timeZone = "Asia/Jakarta") {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(date)) % 24;
  if (hour < 4) return "Selamat malam";
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function newestFirst<T>(items: readonly T[], timestamp: (item: T) => string | undefined) {
  return items
    .map((item, index) => ({ item, index, time: Date.parse(timestamp(item) || "") || 0 }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map(({ item }) => item);
}

export type OpenBill = { invoice: Invoice; state: "unpaid" | "submitted" };

/**
 * The bill the dashboard should surface: the newest unpaid bill (it needs the
 * parent's action), otherwise the newest bill still awaiting verification.
 * `null` when every bill is settled, or when the bills could not be read.
 */
export function latestOpenInvoice(invoices: readonly Invoice[] | null | undefined): OpenBill | null {
  if (!invoices) return null;
  const ordered = newestFirst(invoices, (invoice) => invoice.invoiceDate);
  const unpaid = ordered.find((invoice) => invoicePaymentState(invoice) === "unpaid" && invoice.paidAmount < invoice.billAmount);
  if (unpaid) return { invoice: unpaid, state: "unpaid" };
  const submitted = ordered.find((invoice) => invoicePaymentState(invoice) === "submitted");
  return submitted ? { invoice: submitted, state: "submitted" } : null;
}

/** The most recently dated activity; items without a date keep their list order after dated ones. */
export function latestActivity(activities: readonly Activity[]): Activity | undefined {
  return newestFirst(activities, (activity) => activity.occurredAt)[0];
}
