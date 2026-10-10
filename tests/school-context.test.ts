import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "access_token" ? { value: "test-access-token" } : undefined,
  }),
}));

const apiOrigin = "https://backend.example.test";
let payloads: Record<string, unknown>;
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadSchoolResolver() {
  vi.resetModules();
  vi.stubEnv("DJANGO_API_URL", apiOrigin);
  const { schoolForBackend } = await import("@/lib/backend");
  return schoolForBackend;
}

describe("guardian school context", () => {
  beforeEach(() => {
    payloads = {};
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url in payloads ? jsonResponse(payloads[url]) : jsonResponse({ detail: "Not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("uses the student's current class rather than an older class assignment", async () => {
    payloads[`${apiOrigin}/api/students/42/`] = {
      id: 42,
      location_id: 11,
      class_students: [
        {
          class_id: 100,
          is_current: false,
          class: { id: 100, name: "Class A", branch: 5, branch_name: "Old Campus", academic_year_name: "2025/2026" },
        },
        {
          class_id: 200,
          is_current: true,
          class: { id: 200, name: "Class B", branch: 9, branch_name: "North Campus", academic_year_name: "2026/2027" },
        },
      ],
    };
    payloads[`${apiOrigin}/api/branches/9/`] = {
      id: 9,
      school: 4,
      name: "North Campus",
      location_id: 11,
      address: "North road",
      phone: "08123456789",
      email: "north@example.test",
    };
    payloads[`${apiOrigin}/api/schools/4/`] = { id: 4, name: "Correct School", register_number: "SCH-4" };

    const schoolForBackend = await loadSchoolResolver();
    const school = await schoolForBackend(42);

    expect(school).toMatchObject({
      name: "Correct School",
      branch_name: "North Campus",
      academic_year: "2026/2027",
      address: "North road",
      email: "north@example.test",
    });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(`${apiOrigin}/api/branches/5/`);
  });

  it("does not mistake a historical class for the student's current branch", async () => {
    payloads[`${apiOrigin}/api/students/10/`] = {
      id: 10,
      location_id: 77,
      class_students: [
        { class_id: 100, is_current: false, class: { id: 100, name: "Class A", branch: 5, branch_name: "Old Campus" } },
      ],
    };
    payloads[`${apiOrigin}/api/branches/`] = [
      { id: 5, school: 1, name: "Old Campus", location_id: 50 },
      { id: 9, school: 4, name: "North Campus", location_id: 77, email: "north@example.test" },
    ];
    payloads[`${apiOrigin}/api/schools/4/`] = { id: 4, name: "Correct School" };

    const schoolForBackend = await loadSchoolResolver();
    const school = await schoolForBackend(10);

    expect(school).toMatchObject({ name: "Correct School", branch_name: "North Campus" });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(`${apiOrigin}/api/schools/1/`);
  });

  it("follows backend pagination before resolving a student's location to a branch", async () => {
    const branchPageTwo = `${apiOrigin}/api/branches/?page=2`;
    payloads[`${apiOrigin}/api/students/7/`] = { id: 7, location_id: 77, class_students: [] };
    payloads[`${apiOrigin}/api/class-students/?student_id=7`] = [];
    payloads[`${apiOrigin}/api/branches/`] = {
      count: 21,
      next: branchPageTwo,
      results: Array.from({ length: 20 }, (_, index) => ({ id: index + 1, school: 1, location_id: 100 + index })),
    };
    payloads[branchPageTwo] = {
      count: 21,
      next: null,
      results: [{ id: 21, school: 4, name: "North Campus", location_id: 77, email: "north@example.test" }],
    };
    payloads[`${apiOrigin}/api/schools/4/`] = { id: 4, name: "Correct School" };
    payloads[`${apiOrigin}/api/academic-years/?branch_id=21&is_current=true`] = {
      count: 1,
      next: null,
      results: [{ id: 3, branch: 21, name: "2026/2027", is_current: true }],
    };

    const schoolForBackend = await loadSchoolResolver();
    const school = await schoolForBackend(7);

    expect(school).toMatchObject({ name: "Correct School", branch_name: "North Campus", academic_year: "2026/2027" });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContain(branchPageTwo);
  });

  it("does not guess when a location matches multiple branches and there is no current class", async () => {
    payloads[`${apiOrigin}/api/students/8/`] = { id: 8, location_id: 55, class_students: [] };
    payloads[`${apiOrigin}/api/class-students/?student_id=8`] = [];
    payloads[`${apiOrigin}/api/branches/`] = [
      { id: 1, school: 1, name: "Main Campus", location_id: 55 },
      { id: 2, school: 2, name: "Other Campus", location_id: 55 },
    ];

    const schoolForBackend = await loadSchoolResolver();
    const school = await schoolForBackend(8);

    expect(school).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(`${apiOrigin}/api/schools/1/`);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(`${apiOrigin}/api/schools/2/`);
  });
});
