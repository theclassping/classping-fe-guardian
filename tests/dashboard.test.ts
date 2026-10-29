import { describe, expect, it } from "vitest";
import type { Activity, Invoice } from "@/lib/data";
import { greetingFor, latestActivity, latestOpenInvoice } from "@/lib/dashboard";

const baseInvoice: Invoice = {
  childId: "alya", slug: "1", month: "Oktober 2026", feeType: "SPP", amount: "Rp 500.000", billAmount: 500000, paidAmount: 0,
  dueDate: "30 Oktober 2026", status: "Unpaid", statusTone: "warning", method: "", paidAt: "—", fine: "Tidak ada",
};
const invoice = (overrides: Partial<Invoice>): Invoice => ({ ...baseInvoice, ...overrides });

describe("dashboard greeting", () => {
  it.each([
    ["2026-10-29T00:00:00Z", "Selamat pagi"],
    ["2026-10-29T05:00:00Z", "Selamat siang"],
    ["2026-10-29T09:30:00Z", "Selamat sore"],
    ["2026-10-29T13:00:00Z", "Selamat malam"],
    ["2026-10-29T17:00:00Z", "Selamat malam"],
  ])("greets by Jakarta time at %s", (iso, expected) => {
    expect(greetingFor(new Date(iso))).toBe(expected);
  });
});

describe("latest open bill", () => {
  it("prefers the newest unpaid bill", () => {
    const result = latestOpenInvoice([
      invoice({ slug: "old", invoiceDate: "2026-08-01" }),
      invoice({ slug: "paid", status: "Paid", paidAmount: 500000, invoiceDate: "2026-10-01" }),
      invoice({ slug: "new", invoiceDate: "2026-09-01" }),
    ]);
    expect(result).toMatchObject({ state: "unpaid", invoice: { slug: "new" } });
  });

  it("falls back to a bill awaiting verification when nothing is unpaid", () => {
    const result = latestOpenInvoice([
      invoice({ slug: "paid", status: "Paid", paidAmount: 500000, invoiceDate: "2026-10-01" }),
      invoice({ slug: "waiting", status: "Payment Submitted", invoiceDate: "2026-09-01" }),
    ]);
    expect(result).toMatchObject({ state: "submitted", invoice: { slug: "waiting" } });
  });

  it("returns nothing when every bill is settled or the bills could not be read", () => {
    expect(latestOpenInvoice([invoice({ status: "Paid", paidAmount: 500000 })])).toBeNull();
    expect(latestOpenInvoice([])).toBeNull();
    expect(latestOpenInvoice(null)).toBeNull();
  });
});

describe("latest activity", () => {
  const activity = (slug: string, occurredAt?: string): Activity => ({
    childId: "alya", slug, title: slug, date: "", time: "", emoji: "🎨", secondaryEmoji: "📷", tone: "mint", photos: 0,
    summary: "", description: "", teacher: "Bu Guru", teacherNote: "", skills: [], occurredAt,
  });

  it("picks the most recently dated activity regardless of list order", () => {
    expect(latestActivity([activity("a", "2026-09-01"), activity("b", "2026-10-05T08:00:00Z"), activity("c", "2026-10-01")])?.slug).toBe("b");
  });

  it("keeps list order for undated activities and handles an empty list", () => {
    expect(latestActivity([activity("first"), activity("second")])?.slug).toBe("first");
    expect(latestActivity([])).toBeUndefined();
  });
});
