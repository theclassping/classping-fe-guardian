import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChild } from "@/lib/data";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "access_token" ? { value: "test-access-token" } : undefined,
  }),
}));

const apiOrigin = "https://backend.example.test";
const contextUrl = (studentId: number) => `${apiOrigin}/api/parent/context/?student_id=${studentId}`;
let payloads: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

async function loadBackend() {
  vi.resetModules();
  vi.stubEnv("DJANGO_API_URL", apiOrigin);
  return import("@/lib/backend");
}

const currentClass = { id: 200, name: "Class B", branch: 9, branch_name: "North Campus", academic_year: 3 };
const context = {
  students: [{ id: 42, first_name: "Gita", last_name: "Gateway" }],
  student: {
    id: 42,
    first_name: "Gita",
    last_name: "Gateway",
    nickname: "Gigi",
    student_guardians: [
      { guardian_name: "Second Guardian", is_primary: false },
      { guardian_name: "Primary Guardian", is_primary: true },
    ],
    class_students: [
      { class_id: 100, is_current: false, class: { id: 100, name: "Class A", branch: 5, academic_year_name: "2025/2026" } },
      { class_id: 200, is_current: true, class: { ...currentClass, academic_year_name: "2026/2027" } },
    ],
  },
  current_class: currentClass,
  branch: { id: 9, school: 4, name: "North Campus", address: "North road", phone: "08123456789", email: "north@example.test", is_payment_gateway_enabled: true },
  school: { id: 4, name: "Correct School", register_number: "SCH-4" },
};

describe("guardian context from GET /api/parent/context/", () => {
  beforeEach(() => {
    payloads = {};
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url in payloads ? jsonResponse(payloads[url]) : jsonResponse({ detail: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("uses the branch and school the backend resolved, with the current class's academic year", async () => {
    payloads[contextUrl(42)] = context;
    const { schoolForBackend } = await loadBackend();

    expect(await schoolForBackend(42)).toMatchObject({
      name: "Correct School",
      register_number: "SCH-4",
      branch_name: "North Campus",
      branch_id: 9,
      address: "North road",
      phone_number: "08123456789",
      email: "north@example.test",
      academic_year: "2026/2027",
      payment_gateway_enabled: true,
    });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([contextUrl(42)]);
  });

  it("reads the academic year record when the class does not embed its name, and only for this branch", async () => {
    payloads[contextUrl(42)] = { ...context, student: { ...context.student, class_students: [] } };
    payloads[`${apiOrigin}/api/academic-years/3/`] = { id: 3, branch: 9, name: "2026/2027" };
    const { schoolForBackend } = await loadBackend();
    expect((await schoolForBackend(42))?.academic_year).toBe("2026/2027");

    payloads[`${apiOrigin}/api/academic-years/3/`] = { id: 3, branch: 5, name: "Other branch year" };
    const reloaded = await loadBackend();
    expect((await reloaded.schoolForBackend(42))?.academic_year).toBeUndefined();
  });

  it("has no school when the backend has no branch or school for the student, or cannot be read", async () => {
    payloads[contextUrl(42)] = { ...context, branch: null, school: null };
    const { schoolForBackend } = await loadBackend();
    expect(await schoolForBackend(42)).toBeNull();
    expect(await schoolForBackend(43)).toBeNull();
  });

  it("builds the child profile from the student and its current class", async () => {
    payloads[contextUrl(42)] = context;
    const { studentForBackend } = await loadBackend();

    expect(await studentForBackend(42, getChild())).toMatchObject({
      name: "Gita Gateway",
      firstName: "Gita",
      nickname: "Gigi",
      initials: "GG",
      className: "Kelas B · North Campus",
      classId: 200,
      branchId: 9,
    });
  });

  it("falls back to neutral values when the context cannot be read", async () => {
    const { studentForBackend } = await loadBackend();
    expect(await studentForBackend(42, getChild())).toMatchObject({ name: "Siswa", className: "Kelas belum tersedia", classId: undefined });
  });

  it("answers the online-payment switch, the receipt guardian and the student list from the same context", async () => {
    payloads[contextUrl(42)] = context;
    const { linkedStudentsForGuardian, paymentGatewayForStudent, primaryGuardianNameForStudent } = await loadBackend();

    expect(await paymentGatewayForStudent(42)).toEqual({ enabled: true, branchId: 9 });
    expect(await paymentGatewayForStudent(undefined)).toEqual({ enabled: false });
    expect(await primaryGuardianNameForStudent(42)).toBe("Primary Guardian");
    expect(await linkedStudentsForGuardian(42)).toEqual([{ id: 42, name: "Gita Gateway", nickname: "Gita", initials: "GG" }]);
  });
});
