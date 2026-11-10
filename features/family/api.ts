// The signed-in guardian, the selected child and its school, read on the server.
import { cookies } from "next/headers";
import { decodeIdentity, linkedStudentIds } from "@/lib/auth";
import { fullName, initialsOf } from "@/lib/format";
import { positiveId, records } from "@/lib/records";
import { childQueryFor } from "@/lib/routes";
import { get } from "@/lib/server-api";
import { SESSION_COOKIES } from "@/lib/session";
import { guardianUserId, primaryGuardianName } from "@/features/family/guardians";
import { UNKNOWN_CHILD, type ApiAcademicYear, type ApiClass, type ApiGuardian, type ApiParentContext, type ApiStudent, type ChildProfile, type GuardianSchool } from "@/features/family/types";

/** The signed-in guardian from the identity cookie, or `null`. */
export async function sessionIdentity() {
  return decodeIdentity((await cookies()).get(SESSION_COOKIES.identity)?.value);
}

/** The selected child's backend id: the current-student cookie when it is one of the guardian's students, else the first one. */
export async function sessionStudentId() {
  const identity = await sessionIdentity();
  if (!identity) return undefined;
  const currentId = Number((await cookies()).get(SESSION_COOKIES.currentStudentId)?.value);
  if (Number.isInteger(currentId) && linkedStudentIds(identity).has(currentId)) return currentId;
  return identity.student_id ?? identity.students?.[0]?.id;
}

/**
 * Everything the dashboard needs to know about the selected child, in one backend call: the guardian's
 * students, the student, its current class, and that class's branch and school (the backend decides the
 * branch). The layout and the page both ask for it; Next.js sends one request per page render.
 */
async function parentContextFor(studentId: number): Promise<ApiParentContext> {
  return (await get<ApiParentContext>(`/api/parent/context/?student_id=${studentId}`)) || {};
}

/** "Class A" in branch "Main Campus" → "Kelas A · Main Campus". */
function formatClassLabel(name?: string, branchName?: string) {
  if (!name) return undefined;
  const className = name.trim().replace(/^class\b/i, "Kelas");
  const hasBranch = branchName?.trim() && className.toLowerCase().includes(branchName.trim().toLowerCase());
  const label = branchName?.trim() && !hasBranch ? `${className} · ${branchName.trim()}` : className;
  return label.startsWith("Kelas ") ? label : `Kelas ${label}`;
}

/** The child's profile; names saved at login are used when the backend cannot be read. */
export async function studentForBackend(studentId: number): Promise<ChildProfile> {
  const [identity, context] = await Promise.all([sessionIdentity(), parentContextFor(studentId)]);
  const linkedStudent = identity?.students?.find((student) => student.id === studentId);
  const fallbackName = linkedStudent?.name || UNKNOWN_CHILD.name;
  const fallback: ChildProfile = {
    ...UNKNOWN_CHILD,
    name: fallbackName,
    firstName: fallbackName.split(" ")[0],
    nickname: linkedStudent?.nickname || fallbackName.split(" ")[0],
    initials: linkedStudent?.initials || UNKNOWN_CHILD.initials,
  };
  const currentClass = context.current_class;
  const classFields = {
    className: formatClassLabel(currentClass?.name, currentClass?.branch_name) || UNKNOWN_CHILD.className,
    classId: positiveId(currentClass?.id),
    branchId: positiveId(currentClass?.branch),
  };
  const item = context.student;
  if (!item?.id) return { ...fallback, ...classFields };
  const name = fullName(item.first_name, item.middle_name, item.last_name) || fallback.name;
  return { ...fallback, name, firstName: item.first_name || fallback.firstName, nickname: item.nickname || item.first_name || fallback.firstName, initials: initialsOf(name), ...classFields };
}

/**
 * The child selected for this request: its profile, its backend id (as a string for links and as a number
 * for API calls) and the query string that keeps it selected on dashboard links.
 */
export async function selectedStudentForRequest() {
  const numericStudentId = await sessionStudentId();
  const child = numericStudentId ? await studentForBackend(numericStudentId) : UNKNOWN_CHILD;
  const studentId = numericStudentId ? String(numericStudentId) : undefined;
  return { child, studentId, numericStudentId, childQuery: childQueryFor(studentId) };
}

/** Name of the guardian the school addresses for this student: the primary guardian, like the verification email, else the first linked one. */
export async function primaryGuardianNameForStudent(studentId: number) {
  return primaryGuardianName((await parentContextFor(studentId)).student?.student_guardians);
}

/** The guardian's students for the profile page, in the backend's order. */
export async function linkedStudentsForGuardian(studentId: number) {
  return ((await parentContextFor(studentId)).students || [])
    .filter((student): student is ApiStudent & { id: number } => typeof student.id === "number")
    .map((student) => {
      const name = fullName(student.first_name, student.middle_name, student.last_name) || "Siswa";
      return { id: student.id, name, nickname: student.nickname || student.first_name, initials: initialsOf(name) };
    });
}

/** Academic year of the student's current class: from the embedded class, else from the academic year record. */
async function academicYearFor(student: ApiStudent | null | undefined, currentClass: ApiClass | null | undefined, branchId: number | undefined) {
  const embedded = student?.class_students?.find((link) => link.is_current === true && Number(link.class?.id ?? link.class_id) === Number(currentClass?.id))?.class;
  if (embedded?.academic_year_name) return embedded.academic_year_name;
  if (currentClass?.academic_year == null) return undefined;
  const year = await get<ApiAcademicYear>(`/api/academic-years/${encodeURIComponent(String(currentClass.academic_year))}/`);
  return year && Number(year.branch) === branchId ? year.name : undefined;
}

/** School and branch details for the selected child, or `null` when the backend has no branch or school for it. */
export async function schoolForBackend(studentId: number): Promise<GuardianSchool | null> {
  const { student, current_class: currentClass, branch, school } = await parentContextFor(studentId);
  if (!branch?.id || !school) return null;
  const branchId = Number(branch.id) || undefined;
  return {
    ...school,
    address: branch.address,
    phone_number: branch.phone,
    email: branch.email,
    branch_name: branch.name,
    branch_id: branchId,
    academic_year: await academicYearFor(student, currentClass, branchId),
    payment_gateway_enabled: Boolean(branch.is_payment_gateway_enabled),
  };
}

/** Whether the selected child's branch offers online payment through the gateway. */
export async function paymentGatewayForStudent(studentId?: number): Promise<{ enabled: boolean; branchId?: number }> {
  if (!studentId) return { enabled: false };
  const { branch } = await parentContextFor(studentId);
  return { enabled: Boolean(branch?.is_payment_gateway_enabled), branchId: positiveId(branch?.id) };
}

/** The guardian record of the signed-in user, by guardian id, else by user id or email. */
export async function guardianForBackend(guardianId?: number, userId?: number, email?: string) {
  if (guardianId) {
    const guardian = await get<ApiGuardian>(`/api/guardians/${guardianId}/`);
    if (guardian?.id) return guardian;
  }
  return records<ApiGuardian>(await get("/api/guardians/")).find((guardian) =>
    (guardianId && Number(guardian.id) === guardianId)
    || (userId && guardianUserId(guardian) === userId)
    || (email && guardian.email?.toLowerCase() === email.toLowerCase()),
  ) || null;
}
