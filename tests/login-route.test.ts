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
    vi.unstubAllGlobals();
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

  it("requires the backend even if example credentials are submitted", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      loginRequest({ email: "ani.dua.anak@gmail.com", password: "ani2anak" }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: "Server autentikasi belum dikonfigurasi.",
    });
  });

  it("uses the returned user and selects the smallest student ID regardless of backend order", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    const backendFetch = vi.fn()
      .mockResolvedValueOnce(Response.json({
        access: "access-from-login",
        refresh: "refresh-from-login",
        student_id: 7,
        user: {
          id: 10, email: "parent@example.test", full_name: "Parent Name", role: "PARENT",
          guardian_students: [
            { id: 9, student_id: 7, first_name: "Dwisa", middle_name: "Ratna", last_name: "Galih", nickname: "Dwisa" },
            { id: 8, student_id: 6, first_name: "Pratama", middle_name: "Ratna", last_name: "Galih", nickname: "Pratama" },
          ],
        },
      }));
    vi.stubGlobal("fetch", backendFetch);
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(loginRequest({ email: "parent@example.test", password: "password" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      student_id: 6,
      user: { id: 10, name: "Parent Name", email: "parent@example.test", role: "PARENT" },
    });
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(response.cookies.get("guardian_identity")?.value).toBeDefined();
    const identity = JSON.parse(Buffer.from(response.cookies.get("guardian_identity")!.value, "base64url").toString("utf8"));
    expect(identity.student_id).toBe(6);
    expect(identity.students).toEqual([
      { id: 6, name: "Pratama Ratna Galih", nickname: "Pratama", initials: "PR" },
      { id: 7, name: "Dwisa Ratna Galih", nickname: "Dwisa", initials: "DR" },
    ]);
    expect(response.cookies.get("access_token")?.value).toBe("access-from-login");
  });

  it("falls back to guardian-student relationships when the returned nested list is empty", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    const backendFetch = vi.fn()
      .mockResolvedValueOnce(Response.json({
        access: "access-from-login",
        refresh: "refresh-from-login",
        user: {
          id: 10,
          email: "parent@example.test",
          full_name: "Parent Name",
          role: "PARENT",
          guardian_students: [],
        },
      }))
      .mockResolvedValueOnce(Response.json([
        { id: 3, user: 10, name: "Parent Name", email: "parent@example.test" },
      ]))
      .mockResolvedValueOnce(Response.json([
        { id: 12, guardian: 3, student: 42 },
      ]))
      .mockResolvedValueOnce(Response.json([
        { id: 42, first_name: "Satya", middle_name: "Putra", last_name: "Darma", nickname: "Satya" },
      ]));
    vi.stubGlobal("fetch", backendFetch);
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(loginRequest({ email: "parent@example.test", password: "password" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      student_id: 42,
      user: {
        guardian_id: 3,
        students: [{ id: 42, name: "Satya Putra Darma", nickname: "Satya" }],
      },
    });
    expect(backendFetch).toHaveBeenCalledTimes(4);
    expect(backendFetch.mock.calls.slice(1).map(([url]) => url)).toEqual([
      "https://api.example.test/api/guardians/",
      "https://api.example.test/api/student-guardians/",
      "https://api.example.test/api/students/",
    ]);
  });

  it("rejects a returned user with a role outside the guardian portal", async () => {
    vi.stubEnv("DJANGO_API_URL", "https://api.example.test");
    const backendFetch = vi.fn().mockResolvedValueOnce(Response.json({
      access: "access-from-login",
      refresh: "refresh-from-login",
      user: { id: 10, role: "TEACHER" },
    }));
    vi.stubGlobal("fetch", backendFetch);
    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(loginRequest({ email: "teacher@example.test", password: "password" }));

    expect(response.status).toBe(403);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(response.cookies.get("access_token")).toBeUndefined();
  });

});
