import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function request(path: string, body?: unknown, cookies: Record<string, string> = {}) {
  const result = new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const [name, value] of Object.entries(cookies)) result.cookies.set(name, value);
  return result;
}

describe("logout API route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DJANGO_API_URL", "");
  });

  it("returns success and clears local auth cookies", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST(
      request("/api/auth/logout", undefined, {
        access_token: "access",
        refresh_token: "refresh",
        guardian_identity: "identity",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.cookies.get("access_token")?.value).toBe("");
    expect(response.cookies.get("refresh_token")?.value).toBe("");
    expect(response.cookies.get("guardian_identity")?.value).toBe("");
  });
});

describe("forgot-password API route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns configuration error when the backend URL is missing", async () => {
    vi.stubEnv("DJANGO_API_URL", "");
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("/api/auth/forgot-password", { email: "rina@example.com" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: "Server autentikasi belum dikonfigurasi.",
    });
  });

  it("forwards the request body and backend response", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test/");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Jika akun ada, email dikirim." }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      request("/api/auth/forgot-password", { email: "rina@example.com" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      detail: "Jika akun ada, email dikirim.",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/forgot-password/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns a gateway error when the backend cannot be reached", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(request("/api/auth/forgot-password", { email: "rina@example.com" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      detail: "Tidak dapat menghubungi server autentikasi.",
    });
  });
});

describe("reset-password API route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("forwards the reset request and clears only guardian cookies on success", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: "Password has been reset successfully." }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request("/api/auth/reset-password", {
      uid: "NA", token: "valid-token", new_password: "NewPassword123!",
    }, { access_token: "guardian", school_access_token: "school" }));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/auth/reset-password/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response.cookies.get("access_token")?.value).toBe("");
    expect(response.cookies.get("refresh_token")?.value).toBe("");
    expect(response.cookies.get("school_access_token")).toBeUndefined();
  });

  it("keeps sessions and forwards an invalid-link response", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { detail: "Invalid or expired password reset link." }, { status: 400 },
    )));
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(request("/api/auth/reset-password", {
      uid: "NA", token: "expired", new_password: "NewPassword123!",
    }));

    expect(response.status).toBe(400);
    expect(response.cookies.get("access_token")).toBeUndefined();
    await expect(response.json()).resolves.toEqual({ detail: "Invalid or expired password reset link." });
  });
});
