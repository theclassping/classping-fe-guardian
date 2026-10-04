import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("login API route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DJANGO_API_URL", "");
  });

  it("rejects requests missing an email or password", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(loginRequest({ email: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      detail: "Email dan kata sandi wajib diisi.",
    });
  });

  it("logs in with the configured demo account", async () => {
    vi.stubEnv("DEMO_AUTH_ENABLED", "true");
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      loginRequest({
        email: "ANI.DUA.ANAK@GMAIL.COM",
        password: "ani2anak",
        remember: true,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      demo: true,
      user: { name: "Rina Ramadhani", role: "PARENT" },
    });
    expect(response.cookies.get("access_token")?.value).toBe(
      "classping-guardian-demo",
    );
    expect(response.cookies.get("access_token")?.maxAge).toBe(604800);
  });

  it("rejects invalid demo credentials when no backend is configured", async () => {
    vi.stubEnv("DEMO_AUTH_ENABLED", "true");
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      loginRequest({ email: "ani.dua.anak@gmail.com", password: "wrong" }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: "Server autentikasi belum dikonfigurasi.",
    });
  });
});
