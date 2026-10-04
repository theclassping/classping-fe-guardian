import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string, cookies: Record<string, string> = {}) {
  const result = new NextRequest(`http://localhost${path}`);
  for (const [name, value] of Object.entries(cookies)) {
    result.cookies.set(name, value);
  }
  return result;
}

describe("route protection proxy", () => {
  it("redirects unauthenticated dashboard requests to login", () => {
    const response = proxy(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fdashboard",
    );
  });

  it("preserves a nested dashboard path in the login redirect", () => {
    const response = proxy(request("/dashboard/payments/detail"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fdashboard%2Fpayments%2Fdetail",
    );
  });

  it("redirects an authenticated login request to the dashboard", () => {
    const response = proxy(
      request("/login", {
        access_token: "token",
        guardian_identity: "identity",
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/activities");
  });

  it("allows authenticated dashboard requests through", () => {
    const response = proxy(
      request("/dashboard", {
        access_token: "token",
        guardian_identity: "identity",
      }),
    );

    expect(response.status).toBe(200);
  });

  it("allows login when the session is incomplete", () => {
    const response = proxy(request("/login", { access_token: "token" }));

    expect(response.status).toBe(200);
  });
});
