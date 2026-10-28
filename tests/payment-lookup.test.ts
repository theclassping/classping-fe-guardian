import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "access_token" ? { value: "test-token" } : undefined,
  }),
}));

const apiOrigin = "https://backend.example.test";
const invoiceRecord = { id: 23, student_id: 6, invoice_date: "2026-10-01", due_date: "2026-10-31", total_amount: "20000.00", amount_paid: "20000.00", status: "paid" };

function stubFetch(status: number, body: unknown = { detail: "Not found" }) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DJANGO_API_URL", apiOrigin);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("guardian bill lookup states", () => {
  it("returns the mapped bill when the backend has it", async () => {
    stubFetch(200, invoiceRecord);
    const { invoiceLookupForBackend } = await import("@/lib/backend");
    const lookup = await invoiceLookupForBackend("23", "alya");
    expect(lookup.state).toBe("found");
    if (lookup.state === "found") expect(lookup.invoice.slug).toBe("23");
  });

  it.each([404, 403])("reports a missing bill on HTTP %d so the friendly not-found page renders", async (status) => {
    stubFetch(status);
    const { invoiceLookupForBackend } = await import("@/lib/backend");
    expect(await invoiceLookupForBackend("23", "alya")).toEqual({ state: "missing" });
  });

  it.each([401, 500, 503])("reports an unavailable backend on HTTP %d instead of a 404", async (status) => {
    stubFetch(status);
    const { invoiceLookupForBackend } = await import("@/lib/backend");
    expect(await invoiceLookupForBackend("23", "alya")).toEqual({ state: "unavailable" });
  });

  it("reports unavailable when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const { invoiceLookupForBackend } = await import("@/lib/backend");
    expect(await invoiceLookupForBackend("23", "alya")).toEqual({ state: "unavailable" });
  });

  it("keeps the legacy invoiceForBackend helper returning undefined for a missing bill", async () => {
    stubFetch(404);
    const { invoiceForBackend } = await import("@/lib/backend");
    expect(await invoiceForBackend("23", "alya")).toBeUndefined();
  });
});
