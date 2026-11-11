import { NextRequest, NextResponse } from "next/server";
import { encodeIdentity, type GuardianIdentity, type LinkedStudent } from "@/lib/auth";
import { accessTokenClaims } from "@/lib/base64url";
import { backendOrigin } from "@/lib/env";
import { fullName, initialsOf } from "@/lib/format";
import { guardianUserId } from "@/features/family/guardians";
import { errorResponse } from "@/lib/http";
import { records } from "@/lib/records";
import { SESSION_COOKIES, sessionCookieOptions } from "@/lib/session";

type BackendUser = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  role?: string;
  guardian_students?: (BackendStudent & { student_id?: number })[];
};

type BackendGuardian = { id?: number | string; user?: number | string | { id?: number | string }; user_id?: number | string; name?: string; email?: string };
type BackendStudentGuardian = { guardian?: number | string; student?: number | string };
type BackendStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string; date_of_birth?: string };

const isPositiveId = (id: number) => Number.isInteger(id) && id > 0;

/** A student as stored in the identity cookie. */
function linkedStudent(student: BackendStudent, id: number, nameFallback = ""): LinkedStudent {
  const name = fullName(student.first_name, student.middle_name, student.last_name) || nameFallback;
  return { id, name, nickname: student.nickname || student.first_name, initials: initialsOf(name) };
}

/**
 * Students linked to the guardian, ordered by id. Some backend responses include guardian_students as an
 * empty array even when the relation exists, so an empty nested list is resolved from the relationship endpoints.
 */
async function resolveLinkedStudents(apiBase: string, accessToken: string, user: BackendUser, userId: number, tokenStudentId: number) {
  const fromUser = (user.guardian_students || [])
    .map((student) => ({ student, id: Number(student.student_id ?? student.id) }))
    .filter(({ id }) => isPositiveId(id))
    .sort((a, b) => a.id - b.id)
    .map(({ student, id }) => linkedStudent(student, id, "Siswa"));
  if (fromUser.length) return { students: fromUser, guardianId: undefined };

  const get = (path: string) => fetch(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const [guardiansResponse, relationsResponse, studentsResponse] = await Promise.all([
    get("/api/guardians/"),
    get("/api/student-guardians/"),
    get("/api/students/"),
  ]);
  const guardian = (guardiansResponse.ok ? records<BackendGuardian>(await guardiansResponse.json()) : [])
    .find((item) => guardianUserId(item) === userId);
  const guardianId = guardian?.id ? Number(guardian.id) : undefined;
  const relations = relationsResponse.ok ? records<BackendStudentGuardian>(await relationsResponse.json()) : [];
  const linkedIds = new Set([
    ...(isPositiveId(tokenStudentId) ? [tokenStudentId] : []),
    ...(guardianId ? relations.filter((relation) => Number(relation.guardian) === guardianId).map((relation) => Number(relation.student)).filter(isPositiveId) : []),
  ]);
  const students = (studentsResponse.ok ? records<BackendStudent>(await studentsResponse.json()) : [])
    .filter((student) => student.id && linkedIds.has(Number(student.id)))
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    .map((student) => linkedStudent(student, Number(student.id)));
  return { students, guardianId };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; remember?: boolean };
    if (!body.email || !body.password) return errorResponse("Email dan kata sandi wajib diisi.", 400);

    const apiBase = backendOrigin();
    if (!apiBase) return errorResponse("Server autentikasi belum dikonfigurasi.", 503);

    const tokenResponse = await fetch(`${apiBase}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
    const tokens = (await tokenResponse.json()) as { access?: string; refresh?: string; student_id?: number; user?: BackendUser; detail?: string };
    if (!tokenResponse.ok || !tokens.access || !tokens.refresh) {
      return errorResponse(tokens.detail || "Email atau kata sandi tidak sesuai.", tokenResponse.status || 401);
    }

    const userId = tokens.user?.id ?? accessTokenClaims(tokens.access).user_id;
    if (!userId) return errorResponse("Identitas pengguna tidak ditemukan pada token.", 502);

    const authHeaders = { Authorization: `Bearer ${tokens.access}` };
    let user = tokens.user;
    if (!user) {
      const userResponse = await fetch(`${apiBase}/api/users/${userId}/`, { headers: authHeaders, cache: "no-store" });
      if (userResponse.ok) user = (await userResponse.json()) as BackendUser;
    }
    if (!user) {
      const guardiansResponse = await fetch(`${apiBase}/api/guardians/`, { headers: authHeaders, cache: "no-store" });
      const guardians = guardiansResponse.ok ? ((await guardiansResponse.json()) as BackendGuardian[]) : [];
      const guardian = Array.isArray(guardians) ? guardians.find((item) => guardianUserId(item) === Number(userId)) : undefined;
      if (!guardian) return errorResponse("Profil pengguna tidak dapat dimuat.", 502);
      user = { id: Number(userId), name: guardian.name, email: guardian.email || body.email, role: "PARENT" };
    }

    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return errorResponse("Akun ini tidak memiliki akses ke portal wali murid.", 403);
    }

    const { students, guardianId } = await resolveLinkedStudents(apiBase, tokens.access, user, Number(userId), Number(tokens.student_id));
    if (!students.length) {
      return errorResponse("Akun wali murid ini belum terhubung dengan siswa. Silakan hubungi pihak sekolah.", 403);
    }

    const identity: GuardianIdentity = {
      id: user.id ?? Number(userId),
      guardian_id: guardianId,
      student_id: students[0].id,
      students,
      name: user.full_name || user.name || fullName(user.first_name, user.last_name) || "Pengguna ClassPing",
      email: user.email || body.email,
      role: user.role,
    };
    const response = NextResponse.json({ success: true, user: identity, student_id: identity.student_id, students: identity.students });
    const options = sessionCookieOptions({ remember: body.remember });
    response.cookies.set(SESSION_COOKIES.accessToken, tokens.access, options);
    response.cookies.set(SESSION_COOKIES.refreshToken, tokens.refresh, options);
    response.cookies.set(SESSION_COOKIES.identity, encodeIdentity(identity), options);
    response.cookies.set(SESSION_COOKIES.currentStudentId, String(identity.student_id), options);
    return response;
  } catch {
    return errorResponse("Tidak dapat terhubung ke server autentikasi.", 502);
  }
}
