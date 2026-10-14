import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorizeGuardianMutation } from "@/lib/guardian-access";
import { backendErrorMessage, isCurrentGuardian, linkedGuardianProfiles, newGuardianLink } from "@/lib/guardians";

const actorId = 10;
const token = `header.${Buffer.from(JSON.stringify({ user_id: actorId })).toString("base64url")}.signature`;
const apiBase = "https://backend.example.test";
const ownGuardian = { id: 1, user_id: actorId, name: "Parent One", email: "one@example.test", phone_number: "", student_guardians: [{ student_id: 5 }] };
const otherGuardian = { id: 2, user_id: 20, name: "Parent Two", email: "two@example.test", phone_number: "" };
const student = { id: 5, student_guardians: [{ guardian: ownGuardian, relationship: "mother", is_primary: true }, { guardian: otherGuardian, relationship: "father", is_primary: false }] };
const addedGuardian = { name: "", first_name: "New", last_name: "Parent", email: " NEW@example.test ", phone_number: "", relationship: "father", is_primary: false };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
function request(path: string, body: unknown, method = "PATCH") {
  const result = new NextRequest(`http://localhost/api/proxy/${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  result.cookies.set("access_token", token);
  return result;
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("guardian settings data", () => {
  it("shows both linked guardians and identifies only the current account as editable", () => {
    const guardians = linkedGuardianProfiles(student);
    expect(guardians.map((guardian) => guardian.name)).toEqual(["Parent One", "Parent Two"]);
    const identity = { id: actorId, guardian_id: 1, name: "Old name", email: "one@example.test", role: "PARENT" as const };
    expect(guardians.map((guardian) => isCurrentGuardian(guardian, identity))).toEqual([true, false]);
    expect(isCurrentGuardian({ ...guardians[1], email: identity.email }, identity)).toBe(false);
  });
  it("handles the backend's flat relation response with separately fetched guardian records", () => {
    expect(linkedGuardianProfiles({ student_guardians: [{ guardian_id: 2, relationship: "father", is_primary: false }] }, { "2": otherGuardian })).toEqual([{ ...otherGuardian, relationship: "father", is_primary: false }]);
  });
  it("uses the new guardian email without the logged-in account ID or a client-generated password", () => {
    expect(newGuardianLink(addedGuardian)).toEqual({ user: { email: "new@example.test", first_name: "New", last_name: "Parent", phone_number: "" }, relationship: "father", is_primary: false });
  });
  it("surfaces nested field validation and general backend errors", () => {
    expect(backendErrorMessage({ student_guardians: [{ user: { email: ["This email is already registered."] } }] }, "Failed")).toContain("Email: This email is already registered.");
    expect(backendErrorMessage({ detail: "Access denied." }, "Failed")).toBe("Access denied.");
    expect(backendErrorMessage({}, "Server unavailable.")).toBe("Server unavailable.");
  });
});

describe("guardian portal server authorization", () => {
  it("rejects paths that could bypass resource ownership checks", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await authorizeGuardianMutation(request("guardians/2", { name: "Changed" }), ["other/../guardians", "2"], apiBase, token))?.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects editing another guardian, even if the identity cookie claims ownership", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(otherGuardian)); vi.stubGlobal("fetch", fetchMock);
    const req = request("guardians/2", { name: "Changed" });
    req.cookies.set("guardian_identity", Buffer.from(JSON.stringify({ id: 20, guardian_id: 2 })).toString("base64url"));
    const result = await authorizeGuardianMutation(req, ["guardians", "2"], apiBase, token);
    expect(result?.status).toBe(403); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("permits own profile and existing relationship updates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(ownGuardian)));
    const result = await authorizeGuardianMutation(request("guardians/1", { name: "Updated", student_guardians: [{ student_id: 5, relationship: "mother", is_primary: true }] }), ["guardians", "1"], apiBase, token);
    expect(result).toBeNull();
  });
  it("rejects reassignment of an own guardian to another user or unrelated student", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(json(ownGuardian))));
    expect((await authorizeGuardianMutation(request("guardians/1", { user_id: 20 }), ["guardians", "1"], apiBase, token))?.status).toBe(403);
    expect((await authorizeGuardianMutation(request("guardians/1", { student_guardians: [{ student_id: 999 }] }), ["guardians", "1"], apiBase, token))?.status).toBe(403);
  });
  it("rejects direct guardian creation and relationship edits through other proxy endpoints", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    for (const [path, method] of [["guardians", "POST"], ["student-guardians/2", "PATCH"], ["users/20", "PATCH"]]) {
      expect((await authorizeGuardianMutation(request(path, {}, method), path.split("/"), apiBase, token))?.status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("allows account creation for a linked student and preserves the request body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(student)));
    const body = { student_guardians: [newGuardianLink(addedGuardian)] };
    const req = request("students/5", body);
    expect(await authorizeGuardianMutation(req, ["students", "5"], apiBase, token)).toBeNull();
    expect(await req.json()).toEqual(body);
  });
  it("resolves ownership from flat student relations before allowing an addition", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ id: 5, student_guardians: [{ guardian_id: 1 }] })).mockResolvedValueOnce(json(ownGuardian));
    vi.stubGlobal("fetch", fetchMock);
    expect(await authorizeGuardianMutation(request("students/5", { student_guardians: [newGuardianLink(addedGuardian)] }), ["students", "5"], apiBase, token)).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(`${apiBase}/api/guardians/1/`, expect.anything());
  });
  it("rejects unrelated students, duplicate guardians, and editing an existing link through student updates", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ id: 9, student_guardians: [{ guardian: otherGuardian }] })).mockImplementation(() => Promise.resolve(json(student)));
    vi.stubGlobal("fetch", fetchMock);
    const body = { student_guardians: [newGuardianLink(addedGuardian)] };
    expect((await authorizeGuardianMutation(request("students/9", body), ["students", "9"], apiBase, token))?.status).toBe(403);
    expect((await authorizeGuardianMutation(request("students/5", { student_guardians: [newGuardianLink({ ...addedGuardian, email: ownGuardian.email })] }), ["students", "5"], apiBase, token))?.status).toBe(400);
    expect((await authorizeGuardianMutation(request("students/5", { student_guardians: [{ id: 2, relationship: "other" }] }), ["students", "5"], apiBase, token))?.status).toBe(403);
  });
  it("forwards an authorized account-creation request and returns backend validation failures", async () => {
    vi.stubEnv("DJANGO_API_URL", apiBase);
    const { PATCH } = await import("@/app/api/proxy/[...path]/route");
    const body = { student_guardians: [newGuardianLink(addedGuardian)] };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(student)).mockResolvedValueOnce(json({ student_guardians: [{ user: { email: ["Invalid email."] } }] }, 400));
    vi.stubGlobal("fetch", fetchMock);
    const response = await PATCH(request("students/5", body), { params: Promise.resolve({ path: ["students", "5"] }) });
    expect(response.status).toBe(400);
    const [, options] = fetchMock.mock.calls[1];
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(Buffer.from(options.body).toString("utf8"))).toEqual(body);
    expect(backendErrorMessage(await response.json(), "Failed")).toContain("Invalid email.");
  });
  it("returns the successful student link without creating a Guardian with the current user's ID", async () => {
    vi.stubEnv("DJANGO_API_URL", apiBase);
    const { PATCH } = await import("@/app/api/proxy/[...path]/route");
    const result = { id: 5, student_guardians: [{ guardian_id: 1 }, { guardian_id: 2 }, { guardian_id: 3, guardian_email: "new@example.test" }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(json(student)).mockResolvedValueOnce(json(result));
    vi.stubGlobal("fetch", fetchMock);
    const response = await PATCH(request("students/5", { student_guardians: [newGuardianLink(addedGuardian)] }), { params: Promise.resolve({ path: ["students", "5"] }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${apiBase}/api/students/5/`, `${apiBase}/api/students/5/`]);
  });
});
