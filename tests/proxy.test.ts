import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string, cookies: Record<string, string> = {}) {
  const result = new NextRequest(`http://localhost${path}`);
  for (const [name, value] of Object.entries(cookies)) {
    result.cookies.set(name, value);
  }
  return result;
}

const linkedGuardianIdentity = Buffer.from(JSON.stringify({
  name: "Guardian Example",
  email: "guardian@example.test",
  role: "PARENT",
  student_id: 42,
  students: [{ id: 42 }],
}), "utf8").toString("base64url");

describe("route protection proxy", () => {
  it("redirects unauthenticated dashboard requests to login", async () => {
    const response = await proxy(request("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fdashboard",
    );
  });

  it("preserves a nested dashboard path in the login redirect", async () => {
    const response = await proxy(request("/dashboard/payments/detail"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fdashboard%2Fpayments%2Fdetail",
    );
  });

  it("redirects an authenticated login request to the dashboard", async () => {
    const response = await proxy(
      request("/login", {
        access_token: "token",
        guardian_identity: linkedGuardianIdentity,
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/activities");
  });

  it("allows authenticated dashboard requests through", async () => {
    const response = await proxy(
      request("/dashboard", {
        access_token: "token",
        guardian_identity: linkedGuardianIdentity,
      }),
    );

    expect(response.status).toBe(200);
  });

  it("allows login when the session is incomplete", async () => {
    const response = await proxy(request("/login", { access_token: "token" }));

    expect(response.status).toBe(200);
  });

  describe("access token renewal", () => {
    const jwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp, user_id: 7 })).toString("base64url")}.sig`;
    const expired = jwt(Math.floor(Date.now() / 1000) - 10);
    const fresh = jwt(Math.floor(Date.now() / 1000) + 3600);
    const session = { refresh_token: "refresh", guardian_identity: linkedGuardianIdentity };

    beforeEach(() => {
      vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it("renews an expired access token and forwards it to the page", async () => {
      const fetchMock = vi.fn(async () => Response.json({ access: fresh }));
      vi.stubGlobal("fetch", fetchMock);
      const incoming = request("/dashboard/payments", { ...session, access_token: expired });
      const response = await proxy(incoming);

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(response.cookies.get("access_token")?.value).toBe(fresh);
      expect(incoming.cookies.get("access_token")?.value).toBe(fresh);
    });

    it("renews when the access cookie is gone but the refresh cookie remains", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ access: fresh })));
      const response = await proxy(request("/dashboard", session));
      expect(response.status).toBe(200);
      expect(response.cookies.get("access_token")?.value).toBe(fresh);
    });

    it("sends the parent back to login when the refresh token is rejected", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ detail: "Token is invalid" }, { status: 401 })));
      const response = await proxy(request("/dashboard/payments/1", { ...session, access_token: expired }));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fdashboard%2Fpayments%2F1");
    });

    it("lets the request through unchanged when the backend cannot renew right now", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ detail: "boom" }, { status: 503 })));
      const response = await proxy(request("/dashboard", { ...session, access_token: expired }));
      expect(response.status).toBe(200);
      expect(response.cookies.get("access_token")).toBeUndefined();
    });

    it("does not call the backend while the access token is still valid", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await proxy(request("/dashboard", { ...session, access_token: fresh }));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
