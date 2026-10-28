import { describe, expect, it } from "vitest";
import type { Invoice } from "@/lib/data";
import { paymentReceiptFor, primaryGuardianName, receiptFileName } from "@/lib/receipt";
import { buildReceiptPdf, pdfSafeText } from "@/lib/receiptPdf";

const child = { name: "Joshua M Tesla", className: "Kelas Demo · Demo School 1" };
const paidInvoice: Invoice = {
  childId: "alya",
  slug: "23",
  month: "Oktober 2026",
  feeType: "Outing Class",
  amount: "Rp 0",
  billAmount: 250000,
  paidAmount: 250000,
  dueDate: "30 Oktober 2026",
  status: "Paid",
  statusTone: "success",
  method: "Bank Transfer",
  paidAt: "Rabu, 28 Oktober 2026 pukul 04.23",
  fine: "Tidak ada",
  verifiedAt: "Rabu, 28 Oktober 2026 pukul 04.23",
  proofUrl: "https://media.example.test/proof.jpg",
  invoiceNo: "INV-1-1-1-20261022-20261022090811",
};

describe("verification receipt mapping", () => {
  it("mirrors the verification email for a paid bill", () => {
    const receipt = paymentReceiptFor(paidInvoice, child, "42");
    expect(receipt).toEqual({
      reference: "INV-1-1-1-20261022-20261022090811",
      student: "Joshua M Tesla",
      className: "Kelas Demo · Demo School 1",
      feeType: "Outing Class",
      period: "Oktober 2026",
      method: "Bank Transfer",
      amount: expect.stringMatching(/^Rp\s250\.000$/),
      paidAt: "Rabu, 28 Oktober 2026 pukul 04.23",
      verifiedAt: "Rabu, 28 Oktober 2026 pukul 04.23",
      downloadHref: "/api/receipts/23?student_id=42",
    });
  });

  it("returns nothing while the bill is unpaid or awaiting verification", () => {
    expect(paymentReceiptFor({ ...paidInvoice, status: "Payment Submitted", paidAmount: 0 }, child)).toBeNull();
    expect(paymentReceiptFor({ ...paidInvoice, status: "Unpaid", paidAmount: 0 }, child)).toBeNull();
  });

  it("falls back to the bill id when the backend has no invoice number", () => {
    const receipt = paymentReceiptFor({ ...paidInvoice, invoiceNo: undefined }, child);
    expect(receipt?.reference).toBe("INV-23");
    expect(receipt?.downloadHref).toBe("/api/receipts/23");
  });

  it("names the file after the invoice reference", () => {
    expect(receiptFileName(paymentReceiptFor(paidInvoice, child)!)).toBe("bukti-verifikasi-INV-1-1-1-20261022-20261022090811.pdf");
  });
});

describe("receipt recipient", () => {
  it("addresses the primary guardian even when listed second", () => {
    expect(primaryGuardianName([
      { guardian_name: "Tante Sari", is_primary: false },
      { guardian_name: "Ayah Tesla", is_primary: true },
    ])).toBe("Ayah Tesla");
  });

  it("falls back to the first named guardian, and to nothing when none is linked", () => {
    expect(primaryGuardianName([{ guardian_name: "  " }, { guardian_name: "Ibu Tesla" }])).toBe("Ibu Tesla");
    expect(primaryGuardianName([])).toBeUndefined();
    expect(primaryGuardianName(undefined)).toBeUndefined();
  });
});

describe("verification receipt PDF", () => {
  it("strips characters the standard fonts cannot draw", () => {
    expect(pdfSafeText("Rp 250.000 — “Lunas” ✓")).toBe('Rp 250.000 - "Lunas" ');
  });

  it("renders a PDF document", async () => {
    const bytes = await buildReceiptPdf(paymentReceiptFor(paidInvoice, child)!, { guardianName: "Ayah Tesla", issuedAt: new Date("2026-10-28T01:00:00Z") });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(1500);
  });
});
