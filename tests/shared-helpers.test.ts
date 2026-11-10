import { describe, expect, it } from "vitest";
import { linkedStudentIds } from "@/lib/auth";
import { accessTokenClaims, decodeBase64UrlJson } from "@/lib/base64url";
import { asSentence, formatDateTime, formatLongDate, formatMonthYear, fullName, initialsOf, rupiah, titleize } from "@/lib/format";
import { guardianUserId } from "@/lib/guardians";
import { isPayableOnline, remainingAmount, totalRemaining } from "@/lib/payments";
import { records, recordsOrNull } from "@/lib/records";
import { childQueryFor, proxyUrl } from "@/lib/routes";

const jwt = (claims: object) => `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

describe("formatting", () => {
  it("formats rupiah and rejects non-numbers", () => {
    // Intl puts a non-breaking space between "Rp" and the amount.
    expect(rupiah(250000)).toBe("Rp 250.000");
    expect(rupiah("505000.00")).toBe("Rp 505.000");
    expect(rupiah("abc")).toBe("—");
  });

  it("formats dates in Jakarta time", () => {
    expect(formatDateTime("2026-11-10T08:00:00Z")).toBe("Selasa, 10 November 2026 pukul 15.00 WIB");
    expect(formatDateTime("2026-11-10T08:00:00Z", { zoneName: false })).toBe("Selasa, 10 November 2026 pukul 15.00");
    expect(formatDateTime("2026-11-10T20:00:00Z", { time: false })).toBe("Rabu, 11 November 2026");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("not a date")).toBe("not a date");
    expect(formatLongDate("2026-11-20", "—")).toBe("20 November 2026");
    expect(formatLongDate(undefined, "Belum tersedia")).toBe("Belum tersedia");
    expect(formatMonthYear("2026-07-13", "Tagihan")).toBe("Juli 2026");
  });

  it("builds names, initials and labels", () => {
    expect(fullName("Gita", null, "Gateway")).toBe("Gita Gateway");
    expect(initialsOf("  gita   gateway tester ")).toBe("GG");
    expect(initialsOf("")).toBe("");
    expect(titleize("payment_submitted")).toBe("Payment Submitted");
    expect(titleize(undefined)).toBe("—");
    expect(asSentence("Bukti tidak sesuai.. ")).toBe("Bukti tidak sesuai.");
    expect(asSentence("Nominal kurang")).toBe("Nominal kurang.");
  });
});

describe("API helpers", () => {
  it("reads list responses in every shape the backend uses", () => {
    expect(records([1, 2])).toEqual([1, 2]);
    expect(records({ results: [1] })).toEqual([1]);
    expect(records({ data: [2] })).toEqual([2]);
    expect(records(null)).toEqual([]);
    expect(recordsOrNull({ detail: "error" })).toBeNull();
    expect(recordsOrNull({ results: [] })).toEqual([]);
  });

  it("builds proxy URLs and the child query", () => {
    expect(proxyUrl("/payments?student_invoice_id=3")).toBe("/api/proxy/payments?student_invoice_id=3");
    expect(childQueryFor("13", "alya")).toBe("?student_id=13");
    expect(childQueryFor(undefined, "alya")).toBe("?child=alya");
  });

  it("decodes JWT claims and base64url JSON without throwing", () => {
    expect(accessTokenClaims(jwt({ user_id: 12, exp: 1800000000 }))).toEqual({ user_id: 12, exp: 1800000000 });
    expect(accessTokenClaims("not-a-jwt")).toEqual({ user_id: undefined, exp: undefined });
    expect(decodeBase64UrlJson(Buffer.from('{"name":"Ibu Ñ"}').toString("base64url"))).toEqual({ name: "Ibu Ñ" });
  });

  it("finds the user a guardian belongs to in any API shape", () => {
    expect(guardianUserId({ user: 5 })).toBe(5);
    expect(guardianUserId({ user: { id: 6 } })).toBe(6);
    expect(guardianUserId({ user_id: 7 })).toBe(7);
    expect(guardianUserId({})).toBeNaN();
  });

  it("lists the students a guardian may view", () => {
    expect([...linkedStudentIds({ student_id: 13, students: [{ id: 13, name: "", initials: "" }, { id: 14, name: "", initials: "" }] })]).toEqual([13, 14]);
  });
});

describe("payment amounts", () => {
  const bill = { billAmount: 500000, paidAmount: 175000 };
  it("never reports a negative remaining amount", () => {
    expect(remainingAmount(bill)).toBe(325000);
    expect(remainingAmount({ billAmount: 100, paidAmount: 200 })).toBe(0);
    expect(totalRemaining([bill, { billAmount: 100, paidAmount: 0 }])).toBe(325100);
  });

  it("offers online payment only for open, unlocked bills", () => {
    const invoice = { childId: "alya" as const, slug: "1", month: "", feeType: "", amount: "", dueDate: "", status: "Unpaid", statusTone: "warning" as const, method: "", paidAt: "", fine: "", ...bill };
    expect(isPayableOnline(invoice)).toBe(true);
    expect(isPayableOnline({ ...invoice, pendingGatewayPayment: { id: 5 } })).toBe(false);
  });
});
