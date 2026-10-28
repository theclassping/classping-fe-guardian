import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/lib/data";
import { invoicePaymentState, latestPayment, submitPaymentProof, verifiedPaymentProofUrl } from "@/lib/payments";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "access_token" ? { value: "test-token" } : undefined,
  }),
}));

const apiOrigin = "https://backend.example.test";
const invoiceRecord = {
  id: 23, student_id: 6, invoice_date: "2026-10-01", due_date: "2026-10-31",
  total_amount: "20000.00", amount_paid: "0.00", status: "unpaid",
};
const rejectedPayment = {
  id: 12, status: "rejected", payment_method: "bank_transfer",
  rejection_reason: "Bukti tidak sesuai dengan tagihan.", paid_at: null,
  verified_at: "2026-10-12T14:00:00Z", created_at: "2026-10-12T13:58:00Z",
  proofs: [{ id: 1, uploaded_at: "2026-10-12T13:58:00Z", image_url: "https://media.example.test/rejected.jpg" }],
};
const invoice: Invoice = {
  childId: "alya", slug: "23", month: "Oktober 2026", feeType: "SPP", amount: "Rp 20.000",
  billAmount: 20000, paidAmount: 0, dueDate: "31 Oktober 2026", status: "Unpaid",
  statusTone: "warning", method: "Bank Transfer", paymentMethod: "bank_transfer", paidAt: "—", fine: "Tidak ada",
};
let payloads: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DJANGO_API_URL", apiOrigin);
  payloads = {};
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return new Response(JSON.stringify(payloads[url] || { detail: "Not found" }), {
      status: url in payloads ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("guardian payment lifecycle", () => {
  it.each([
    { fee_type: { name: "Seragam" } },
    { fee_type_name: "Seragam" },
  ])("preserves the fee type in both the bill list and detail from %j", async (feeType) => {
    const record = { ...invoiceRecord, ...feeType };
    payloads[`${apiOrigin}/api/student-invoices/?student_id=6`] = [record];
    payloads[`${apiOrigin}/api/student-invoices/23/`] = record;
    const { invoicesForBackend, invoiceForBackend } = await import("@/lib/backend");
    const items = await invoicesForBackend("alya", [], 6);
    const detail = await invoiceForBackend("23", "alya");
    expect(items?.[0].feeType).toBe("Seragam");
    expect(detail?.feeType).toBe(items?.[0].feeType);
  });

  it.each([
    ["unpaid", "rejected", "unpaid", false],
    ["payment_submitted", "submitted", "submitted", true],
    ["paid", "completed", "paid", false],
  ] as const)("handles invoice %s with payment %s", async (status, paymentStatus, state, submitted) => {
    payloads[`${apiOrigin}/api/student-invoices/23/`] = {
      ...invoiceRecord, status, amount_paid: state === "paid" ? "20000.00" : "0.00",
    };
    payloads[`${apiOrigin}/api/payments/?student_invoice_id=23`] = {
      results: [{ ...rejectedPayment, status: paymentStatus, paid_at: state === "paid" ? "2026-10-12T14:00:00Z" : null }],
    };
    const { invoiceForBackend } = await import("@/lib/backend");
    const mapped = await invoiceForBackend("23", "alya");

    expect(mapped).toBeDefined();
    expect(invoicePaymentState(mapped!)).toBe(state);
    expect(mapped?.paymentSubmitted).toBe(submitted);
    expect(mapped?.paymentId).toBe(12);
    if (state === "paid") {
      expect(mapped?.proofUrl).toBe("https://media.example.test/rejected.jpg");
      expect(mapped?.verifiedAt).not.toBe("—");
      expect(mapped?.rejectionReason).toBeUndefined();
    } else {
      expect(mapped?.proofUrl).toBeUndefined();
      expect(mapped?.paidAt).toBe("—");
      expect(mapped?.verifiedAt).toBe("—");
    }
    if (paymentStatus === "rejected") {
      expect(mapped?.rejectionReason).toBe(rejectedPayment.rejection_reason);
      expect(mapped?.statusTone).toBe("warning");
    }
  });

  it("keeps a rejected bill available to retry when the payment list request fails", async () => {
    payloads[`${apiOrigin}/api/student-invoices/23/`] = { ...invoiceRecord, payment: rejectedPayment };
    const { invoiceForBackend } = await import("@/lib/backend");
    const mapped = await invoiceForBackend("23", "alya");
    expect(mapped).toMatchObject({ paymentId: 12, paymentSubmitted: false, rejectionReason: rejectedPayment.rejection_reason });
    expect(mapped?.proofUrl).toBeUndefined();
  });

  it("maps the backend's singular payment field in the bill list", async () => {
    payloads[`${apiOrigin}/api/student-invoices/?student_id=6`] = [{ ...invoiceRecord, payment: rejectedPayment }];
    const { invoicesForBackend } = await import("@/lib/backend");
    const mapped = await invoicesForBackend("alya", [], 6);
    expect(mapped?.[0]).toMatchObject({ status: "Unpaid", statusTone: "warning", paymentSubmitted: false, paymentId: 12 });
    expect(mapped?.[0].proofUrl).toBeUndefined();
  });

  it("explains rejection and the retry action in the guardian notification", async () => {
    payloads[`${apiOrigin}/api/student-invoices/?student_id=6`] = [{ ...invoiceRecord, payment: rejectedPayment }];
    const { notificationsForBackend } = await import("@/lib/backend");
    const notifications = await notificationsForBackend(6);
    expect(notifications[0].copy).toContain("Pembayaran ditolak.");
    expect(notifications[0].copy).toContain(rejectedPayment.rejection_reason);
    expect(notifications[0].copy).toContain("Status tagihan kembali menjadi belum dibayar.");
    expect(notifications[0].copy).toContain("Silakan unggah ulang bukti pembayaran atau hubungi pihak sekolah.");
  });

  it("confirms verification and the paid status in the guardian notification", async () => {
    payloads[`${apiOrigin}/api/student-invoices/?student_id=6`] = [{
      ...invoiceRecord, status: "paid", amount_paid: "20000.00",
      payment: { ...rejectedPayment, status: "completed" },
    }];
    const { notificationsForBackend } = await import("@/lib/backend");
    const notifications = await notificationsForBackend(6);
    expect(notifications[0].copy).toBe("Pembayaran Anda telah diverifikasi. Status tagihan telah diperbarui menjadi lunas.");
  });

  it("does not offer upload for a paid invoice that lacks a proof", () => {
    expect(invoicePaymentState({ ...invoice, status: "Paid" })).toBe("paid");
  });
});

describe("verified proof downloads", () => {
  it.each(["rejected", "submitted", undefined])("blocks a %s payment even if it retains a proof URL", (status) => {
    expect(verifiedPaymentProofUrl({ ...rejectedPayment, paid_at: undefined, status })).toBeUndefined();
  });

  it("uses the replacement proof after verification in either array order", () => {
    const oldProof = rejectedPayment.proofs[0];
    const newProof = { id: 2, uploaded_at: "2026-10-13T10:00:00Z", image_url: "https://media.example.test/accepted.jpg" };
    for (const proofs of [[newProof, oldProof], [oldProof, newProof]]) {
      expect(verifiedPaymentProofUrl({ status: "completed", proofs })).toBe(newProof.image_url);
    }
  });

  it("uses the current rejection rather than an older completed record", () => {
    const current = { ...rejectedPayment, paid_at: undefined, submitted_at: "2026-10-13T10:00:00Z" };
    const old = { id: 11, status: "completed", submitted_at: "2026-10-12T10:00:00Z" };
    expect(verifiedPaymentProofUrl(latestPayment([current, old]))).toBeUndefined();
  });
});

describe("proof submission", () => {
  const imageData = { object_key: "2026/10/replacement.png", original_name: "replacement.png" };

  it("attaches a replacement to the existing payment instead of creating a duplicate", async () => {
    payloads["/api/proxy/payment-proofs/"] = { id: 2 };
    await submitPaymentProof({ ...invoice, paymentId: 12 }, "bank_transfer", imageData);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/proxy/payment-proofs/");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ payment_id: 12, image_data: imageData });
  });

  it("creates the initial payment with downloadable storage metadata", async () => {
    payloads["/api/proxy/payments/"] = { id: 12 };
    await submitPaymentProof(invoice, "bank_transfer", imageData);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/proxy/payments/");
    expect(JSON.parse(options.body)).toEqual({
      student_invoice_id: 23, amount: "20000.00", payment_method: "bank_transfer", proofs: [{ image_data: imageData }],
    });
  });

  it("reports a failed retry rather than treating it as submitted", async () => {
    await expect(submitPaymentProof({ ...invoice, paymentId: 12 }, "bank_transfer", imageData)).rejects.toThrow("Not found");
  });
});
