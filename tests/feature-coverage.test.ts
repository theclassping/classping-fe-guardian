import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ClassPing Guardian feature smoke coverage", () => {
  it("keeps every user-facing route present", () => {
    const routes = [
      "app/login/page.tsx",
      "app/forgot-password/page.tsx",
      "app/dashboard/page.tsx",
      "app/dashboard/activities/page.tsx",
      "app/dashboard/activities/[slug]/page.tsx",
      "app/dashboard/assessments/page.tsx",
      "app/dashboard/assessments/[slug]/page.tsx",
      "app/dashboard/payments/page.tsx",
      "app/dashboard/payments/[slug]/page.tsx",
      "app/dashboard/profile/page.tsx",
      "app/dashboard/settings/page.tsx",
      "app/dashboard/school/page.tsx",
    ];

    for (const route of routes) expect(existsSync(resolve(root, route))).toBe(true);
  });

  it("protects the complete dashboard surface through the proxy", () => {
    const proxySource = read("proxy.ts");

    expect(proxySource).toContain('pathname.startsWith("/dashboard")');
    expect(proxySource).toContain('request.cookies.get("access_token")');
    expect(proxySource).toContain('request.cookies.get("guardian_identity")');
    expect(proxySource).toContain('loginUrl.searchParams.set("next", next)');
  });

  it("contains the complete guardian navigation surface", () => {
    const shell = read("components/layout/GuardianShell.tsx");

    for (const label of ["Aktivitas", "SPP & Tagihan", "Profil Sekolah", "Pengaturan"]) {
      expect(shell).toContain(label);
    }
    expect(shell).toContain("PILIH ANAK");
    expect(shell).toContain("Hubungi sekolah");
    expect(shell).toContain("LogoutButton");
  });

  it("wires the primary feature components to their interactive data", () => {
    expect(read("components/ActivityList.tsx")).toContain("setQuery");
    expect(read("components/ActivityList.tsx")).toContain("downloadActivity");
    expect(read("components/AssessmentList.tsx")).toContain("setQuery");
    expect(read("app/dashboard/payments/[slug]/page.tsx")).toContain("PaymentReceiptDialog");
    expect(read("components/NotificationSettings.tsx")).toContain("setSettings");
  });

  it("keeps all authentication endpoints available", () => {
    for (const route of [
      "app/api/auth/login/route.ts",
      "app/api/auth/logout/route.ts",
      "app/api/auth/forgot-password/route.ts",
    ]) {
      expect(existsSync(resolve(root, route))).toBe(true);
    }
  });
});
