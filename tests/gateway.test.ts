import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutHref, gatewayReturnHref, groupChannels, isDummyGatewayMode, isExpired, isExternalMethod, parseInvoiceIds, returnReference, timeLeft, type GatewayChannel } from "@/lib/gateway";
import { channelsForTotal, deadlineFor, dummyCancel, dummyCheckout, dummyMarkPaid, dummyPayment, dummyPendingByInvoice } from "@/lib/gatewayDummy";
import { isPayableOnline } from "@/components/PaymentList";
import type { Invoice } from "@/lib/data";

const invoice: Invoice = {
  childId: "alya", slug: "23", month: "Oktober 2026", feeType: "SPP", amount: "Rp 20.000",
  billAmount: 20000, paidAmount: 0, dueDate: "31 Oktober 2026", status: "Unpaid",
  statusTone: "warning", method: "—", paidAt: "—", fine: "Tidak ada",
};

describe("gateway helpers", () => {
  it("parses and de-duplicates invoice ids from the checkout query", () => {
    expect(parseInvoiceIds("11, 12,11,,13")).toEqual(["11", "12", "13"]);
    expect(parseInvoiceIds(["1", "2"])).toEqual(["1", "2"]);
    expect(checkoutHref(["11", "12"], "?student_id=6")).toBe("/dashboard/payments/checkout?student_id=6&invoices=11%2C12");
  });

  it("reads the dummy flag leniently from hosting dashboards", () => {
    for (const value of ["dummy", " Dummy ", '"dummy"', "'dummy'"]) expect(isDummyGatewayMode(value)).toBe(true);
    for (const value of ["api", "", undefined, "dummy mode"]) expect(isDummyGatewayMode(value)).toBe(false);
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

  it("only offers online payment for open bills that are not locked or in manual verification", () => {
    expect(isPayableOnline(invoice)).toBe(true);
    expect(isPayableOnline({ ...invoice, status: "Payment Submitted" })).toBe(false);
    expect(isPayableOnline({ ...invoice, status: "Paid", paidAmount: 20000 })).toBe(false);
    expect(isPayableOnline({ ...invoice, payableViaGateway: false })).toBe(false);
    expect(isPayableOnline({ ...invoice, pendingGatewayPayment: { id: 1 } })).toBe(false);
  });
});

describe("dummy gateway simulation", () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("prices channels exactly like the gateway/channels response for Rp150.000", () => {
    const channels = channelsForTotal(150000);
    const byCode = Object.fromEntries(channels.map((channel) => [channel.code, channel]));
    expect(channels.map((channel) => channel.code)).toEqual(["VABCA", "VABRI", "VAMANDIRI", "VABNI", "VAPERMATA", "CC", "TOKOPEDIA CC", "TOKOPEDIA NON CC", "BLIBLI CC"]);
    expect(byCode.VABCA).toMatchObject({ payment_method: "virtual_account", transaction_fee: "5000.00", amount: "155000.00" });
    expect(byCode.CC).toMatchObject({ payment_method: "credit_card", transaction_fee: "3062.00", amount: "153062.00" });
    expect(byCode["TOKOPEDIA CC"]).toMatchObject({ payment_method: "e_commerce", transaction_fee: "2672.00", amount: "152672.00" });
    expect(byCode["TOKOPEDIA NON CC"]).toMatchObject({ transaction_fee: "754.00", amount: "150754.00" });
    expect(byCode["BLIBLI CC"]).toMatchObject({ transaction_fee: "2672.00", amount: "152672.00" });
    expect(channelsForTotal(5000)).toEqual([]);
  });

  it("sets the deadline to the end of the next day in WIB", () => {
    const { deadline_date, expires_at } = deadlineFor(new Date("2026-11-07T20:00:00+07:00"));
    expect(deadline_date).toBe("2026-11-08");
    expect(expires_at).toBe("2026-11-08T16:59:59.000Z");
  });

  it("locks invoices while a checkout is pending, is idempotent, and settles on the simulated callback", async () => {
    const items = [{ student_invoice_id: "11", amount: "50000.00" }, { student_invoice_id: "12", amount: "50000.00" }];
    const payment = await dummyCheckout({ invoiceIds: ["11", "12"], channel: "VABNI", idempotencyKey: "abcdef12-0000", items });
    expect(payment).toMatchObject({ status: "pending", payment_method: "virtual_account", invoice_total: "100000.00", amount: "105000.00" });
    expect(payment.payment_code).toMatch(/^988/);
    expect(Object.keys(dummyPendingByInvoice()).sort()).toEqual(["11", "12"]);
    const again = await dummyCheckout({ invoiceIds: ["11", "12"], channel: "VABNI", idempotencyKey: "abcdef12-0000", items });
    expect(again.id).toBe(payment.id);
    await expect(dummyCheckout({ invoiceIds: ["12"], channel: "CC", idempotencyKey: "ffffffff-1111", items: [items[1]] })).rejects.toMatchObject({ code: "INVOICE_LOCKED" });
    dummyMarkPaid(payment.id);
    expect((await dummyPayment(payment.id))?.status).toBe("paid");
    expect(dummyPendingByInvoice()).toEqual({});
  });
});

describe("dummy gateway cancellation", () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lets the guardian abandon a pending checkout, which unlocks its invoices", async () => {
    const items = [{ student_invoice_id: "21", amount: "150000.00" }];
    const payment = await dummyCheckout({ invoiceIds: ["21"], channel: "TOKOPEDIA NON CC", idempotencyKey: "12345678-aaaa", items });
    expect(payment).toMatchObject({ payment_method: "e_commerce", amount: "150754.00", payment_code: null });
    expect(payment.payment_link).toContain("/dashboard/payments/online/simulator?payment_id=");
    expect(Object.keys(dummyPendingByInvoice())).toEqual(["21"]);
    const cancelled = await dummyCancel(payment.id);
    expect(cancelled.status).toBe("cancelled");
    expect(dummyPendingByInvoice()).toEqual({});
    expect((await dummyPayment(payment.id))?.status).toBe("cancelled");
    await expect(dummyCancel(payment.id)).rejects.toMatchObject({ code: "PAYMENT_NOT_PENDING" });
    const retry = await dummyCheckout({ invoiceIds: ["21"], channel: "VABCA", idempotencyKey: "87654321-bbbb", items });
    expect(retry.status).toBe("pending");
    expect(dummyMarkPaid(retry.id)?.status).toBe("paid");
    await expect(dummyCancel(retry.id)).rejects.toMatchObject({ code: "PAYMENT_NOT_PENDING" });
  });
});
