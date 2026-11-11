import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const apiBase = "https://backend.example.test";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

async function forwardThroughProxy(path: string, init: { method: string; headers: Record<string, string>; body?: string }) {
  vi.stubEnv("DJANGO_API_URL", apiBase);
  const fetchMock = vi.fn(async (...args: [RequestInfo | URL, RequestInit?]) => { void args; return Response.json({ id: 9 }, { status: 201 }); });
  vi.stubGlobal("fetch", fetchMock);
  const request = new NextRequest(`http://localhost/api/proxy/${path}`, init);
  request.cookies.set("access_token", "session-token");
  const { POST } = await import("@/app/api/proxy/[...path]/route");
  const response = await POST(request, { params: Promise.resolve({ path: path.split("/") }) });
  const [url, forwarded] = fetchMock.mock.calls[0];
  return { response, url: String(url), headers: new Headers(forwarded?.headers) };
}

describe("API proxy route", () => {
  it("passes the checkout's Idempotency-Key to the backend, which rejects a checkout without it", async () => {
    const { response, url, headers } = await forwardThroughProxy("gateway/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "4f1c-key" },
      body: JSON.stringify({ invoice_ids: [22], channel: "VABCA" }),
    });

    expect(response.status).toBe(201);
    expect(url).toBe(`${apiBase}/api/gateway/checkout/`);
    expect(headers.get("Idempotency-Key")).toBe("4f1c-key");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("does not pass the browser's cookies or its own Authorization header to the backend", async () => {
    const { headers } = await forwardThroughProxy("gateway/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer from-browser", cookie: "other=1", "x-forwarded-host": "evil.example" },
      body: "{}",
    });

    expect(headers.get("Authorization")).toBe("Bearer session-token");
    expect(headers.get("Cookie")).toBeNull();
    expect(headers.get("X-Forwarded-Host")).toBeNull();
  });
});
