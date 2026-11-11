import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelGatewayPayment, checkoutHref, createCheckout, durationLabel, fetchChannels, fetchGatewayPayments, gatewayRedirectHref, gatewayReturnHref, isExternalLink, groupChannels, isExpired, isExternalMethod, parseInvoiceIds, returnReference, STATUS_LABELS, statusTone, timeLeft, type GatewayChannel, type GatewayStatus } from "@/features/payments/gateway";
import { isPayableOnline } from "@/features/payments/helpers";
import type { Invoice } from "@/features/payments/types";

const invoice: Invoice = {
  slug: "23", month: "Oktober 2026", feeType: "SPP", amount: "Rp 20.000",
  billAmount: 20000, paidAmount: 0, dueDate: "31 Oktober 2026", status: "Unpaid",
  statusTone: "warning", method: "—", paidAt: "—", fine: "Tidak ada",
};

describe("gateway helpers", () => {
  it("parses and de-duplicates invoice ids from the checkout query", () => {
    expect(parseInvoiceIds("11, 12,11,,13")).toEqual(["11", "12", "13"]);
    expect(parseInvoiceIds(["1", "2"])).toEqual(["1", "2"]);
    expect(checkoutHref(["11", "12"], "?student_id=6")).toBe("/dashboard/payments/checkout?student_id=6&invoices=11%2C12");
  });

  it("groups channels by method in VA → card → e-commerce order and drops empty groups", () => {
    const channels: GatewayChannel[] = [
      { code: "TOKOPEDIA NON CC", name: "Tokopedia", payment_method: "e_commerce", transaction_fee: "754.00", amount: "150754.00" },
      { code: "CC", name: "Kartu Kredit", payment_method: "credit_card", transaction_fee: "3062.00", amount: "153062.00" },
      { code: "VABNI", name: "BNI Virtual Account", payment_method: "virtual_account", transaction_fee: "5000.00", amount: "155000.00" },
    ];
    expect(groupChannels(channels).map((group) => group.method)).toEqual(["virtual_account", "credit_card", "e_commerce"]);
    expect(isExternalMethod("e_commerce")).toBe(true);
    expect(isExternalMethod("virtual_account")).toBe(false);
  });

  it("builds the hand-over URL and only treats absolute links as provider billing pages", () => {
    expect(gatewayRedirectHref(501, "?student_id=6")).toBe("/dashboard/payments/online/501/redirect?student_id=6");
    expect(isExternalLink("https://billing-client.sandbox.rintisan.co.id/penagihan/abc")).toBe(true);
    expect(isExternalLink("/dashboard/payments/online/501")).toBe(false);
    expect(isExternalLink(null)).toBe(false);
  });

  it("builds the return URL and reads whichever reference the provider sends back", () => {
    expect(gatewayReturnHref({ id: 501, payment_no: "PAY-1" }, "https://guardian.example")).toBe("https://guardian.example/dashboard/payments/online/return?payment_id=501&payment_no=PAY-1");
    expect(returnReference({ payment_id: "501", payment_no: "PAY-1" })).toEqual({ id: "501", paymentNo: "PAY-1" });
    expect(returnReference({ order_id: ["PAY-2"] })).toEqual({ id: undefined, paymentNo: "PAY-2" });
  });

  it("treats a pending checkout past its deadline as expired and formats the time left", () => {
    const now = new Date("2026-11-07T10:00:00+07:00");
    expect(isExpired({ status: "pending", expires_at: "2026-11-07T09:59:00+07:00" }, now)).toBe(true);
    expect(isExpired({ status: "pending", expires_at: "2026-11-08T23:59:59+07:00" }, now)).toBe(false);
    expect(isExpired({ status: "paid", expires_at: "2026-11-01T00:00:00+07:00" }, now)).toBe(false);
    expect(timeLeft("2026-11-08T13:30:00+07:00", now)).toBe("1 hari 3 jam");
    expect(timeLeft("2026-11-07T10:45:00+07:00", now)).toBe("45 menit");
    expect(timeLeft("2026-11-07T09:00:00+07:00", now)).toBe("");
  });

  it("has a label and a badge tone for every status the backend sends, including failed", () => {
    const statuses: GatewayStatus[] = ["pending", "paid", "expired", "cancelled", "failed"];
    for (const status of statuses) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(statusTone(status)).toMatch(/^(warning|success|late|partial)$/);
    }
    expect(STATUS_LABELS.failed).toBe("Gagal dibuat");
  });

  it("formats the payment window from gateway/channels in days, hours and minutes", () => {
    expect(durationLabel(60)).toBe("1 jam");
    expect(durationLabel(90)).toBe("1 jam 30 menit");
    expect(durationLabel(45)).toBe("45 menit");
    expect(durationLabel(1440 + 180)).toBe("1 hari 3 jam");
    expect(durationLabel(0)).toBe("");
    expect(durationLabel(Number.NaN)).toBe("");
  });

  it("only offers online payment for open bills that are not locked or in manual verification", () => {
    expect(isPayableOnline(invoice)).toBe(true);
    expect(isPayableOnline({ ...invoice, status: "Payment Submitted" })).toBe(false);
    expect(isPayableOnline({ ...invoice, status: "Paid", paidAmount: 20000 })).toBe(false);
    expect(isPayableOnline({ ...invoice, payableViaGateway: false })).toBe(false);
    expect(isPayableOnline({ ...invoice, pendingGatewayPayment: { id: 1 } })).toBe(false);
  });
});


describe("gateway API calls from the browser", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(body: unknown, status = 200) {
    const fetchMock = vi.fn(async (...args: [RequestInfo | URL, RequestInit?]) => { void args; return Response.json(body, { status }); });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("calls the proxy without a trailing slash (Next.js would answer one with a redirect)", async () => {
    const fetchMock = stubFetch({ invoice_total: "0", payment_window_minutes: 60, expires_at: "", channels: [] });
    await fetchChannels(["22", "23"]);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/proxy/gateway/channels?invoice_ids=22%2C23");
  });

  it("unwraps the paginated payment list", async () => {
    stubFetch({ count: 1, results: [{ id: 8, payment_no: "PAY-1", invoice_count: 2 }] });
    expect(await fetchGatewayPayments("13")).toMatchObject([{ id: 8, invoice_count: 2 }]);
  });

  it("sends checkout with numeric invoice ids and the idempotency key", async () => {
    const fetchMock = stubFetch({ id: 9 }, 201);
    await createCheckout({ invoiceIds: ["22", "23"], channel: "VABCA", idempotencyKey: "key-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/proxy/gateway/checkout");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("key-1");
    expect(JSON.parse(String(init?.body))).toEqual({ invoice_ids: [22, 23], channel: "VABCA" });
  });

  it("turns a backend error code into the guardian-facing message", async () => {
    stubFetch({ detail: "Invoice locked.", code: "INVOICE_LOCKED" }, 409);
    await expect(cancelGatewayPayment(5)).rejects.toMatchObject({ code: "INVOICE_LOCKED", message: expect.stringContaining("menunggu pembayaran online lain") });
  });
});
