import { cookies } from "next/headers";
import { photosForStudent, studentCaption, type StudentPhoto } from "@/lib/activityVisibility";
import { decodeIdentity, linkedStudentIds } from "@/lib/auth";
import { getChild } from "@/lib/data";
import type { Activity, ChildId, ChildProfile, Invoice } from "@/lib/data";
import { backendOrigin, backendUrl } from "@/lib/env";
import { asSentence, formatDateTime, formatLongDate, formatMonthYear, formatTime, fullName, initialsOf, rupiah, titleize } from "@/lib/format";
import { guardianUserId } from "@/lib/guardians";
import { primaryGuardianName } from "@/lib/receipt";
import { invoicePaymentState, isVerifiedPayment, latestPayment, remainingAmount, verifiedPaymentProofUrl } from "@/lib/payments";
import type { ApiPayment } from "@/lib/payments";
import { records, recordsOrNull } from "@/lib/records";
import { childQueryFor } from "@/lib/routes";
import { SESSION_COOKIES } from "@/lib/session";

type ApiActivity = {
  id?: number;
  name?: string;
  description?: string;
  activity_date?: string;
  created_at?: string;
  updated_at?: string;
  class_name?: string;
  class_teacher_id?: number | string;
  class_teacher?: ApiClassTeacher | number | string;
  teacher?: ApiClassTeacher | string;
  teacher_name?: string;
  activity_images?: ApiActivityImage[];
  activity_students?: ApiStudentLink[];
  students?: ApiStudentLink[];
  is_publish?: boolean;
};

type ApiClassTeacher = {
  id?: number | string;
  teacher_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  staff?: { name?: string; first_name?: string; last_name?: string };
};

type ApiClassStudent = {
  id?: number | string;
  student?: number | string;
  student_id?: number | string;
  class_id?: number | string;
  class_name?: string;
  is_current?: boolean;
  class?: ApiClass;
};

type ApiClass = { id?: number | string; name?: string; branch?: number | string; branch_name?: string; academic_year?: number | string; academic_year_name?: string };

type ApiStudentLink = { id?: number | string; student_id?: number | string; student?: number | string };
type ApiActivityImage = StudentPhoto;

function idsFromLinks(links: ApiStudentLink[] = []) {
  return links.map((link) => Number(link.student_id ?? link.student ?? link.id)).filter((id) => Number.isInteger(id) && id > 0);
}

function imageStudentIds(image: ApiActivityImage) {
  return (image.student_ids ?? (image.student_id == null ? [] : [image.student_id]))
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

function activityMatchesStudent(activity: ApiActivity, studentId: number) {
  const participantLinks = activity.activity_students ?? activity.students ?? [];
  const participantIds = idsFromLinks(participantLinks);
  const taggedImages = activity.activity_images ?? [];
  const hasStudentAssignments = participantIds.length > 0;
  const hasTaggedImages = taggedImages.some((image) => image.student_id != null || Array.isArray(image.student_ids));
  if (!hasStudentAssignments && !hasTaggedImages) return true;
  return participantIds.includes(studentId) || taggedImages.some((image) => imageStudentIds(image).includes(studentId));
}

const imagesForStudent = photosForStudent;

type ApiInvoice = {
  id?: number;
  invoice_no?: string;
  student_id?: number;
  student_name?: string;
  class_name?: string;
  invoice_date?: string;
  created_at?: string;
  updated_at?: string;
  fee_type_name?: string;
  fee_type?: { name?: string } | null;
  due_date?: string;
  status?: string;
  subtotal?: string;
  total_amount?: string;
  amount_paid?: string;
  currency?: string;
  payment_method?: string;
  paid_at?: string;
  payment_date?: string;
  payment?: ApiPayment | null;
  payments?: ApiPayment[];
};

export type GuardianNotification = {
  id: string;
  kind: "activity" | "payment";
  title: string;
  copy: string;
  href: string;
  occurredAt?: string;
};

type ApiStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string; location_id?: number | string | null; class_students?: ApiClassStudent[]; student_guardians?: ApiStudentGuardian[] };
export type ApiStudentGuardian = { id?: number; guardian_id?: number; guardian_name?: string; relationship?: string; is_primary?: boolean };
type ApiBranch = { id?: number | string; school?: number | string; name?: string; code?: string; address?: string; phone?: string; email?: string; location_id?: number | string; is_payment_gateway_enabled?: boolean };
type ApiSchool = { id?: number; name?: string; register_number?: string; image_data?: string; description?: string; branches?: ApiBranch[] };
type ApiAcademicYear = { id?: number | string; branch?: number | string; name?: string; is_current?: boolean };
type ApiGuardian = { id?: number | string; user?: number | string | { id?: number | string }; user_id?: number | string; name?: string; email?: string; phone_number?: string };
export type GuardianSchool = ApiSchool & { address?: string; phone_number?: string; email?: string; branch_name?: string; branch_id?: number; academic_year?: string; payment_gateway_enabled?: boolean };


function formatClassLabel(name?: string, branchName?: string) {
  if (!name) return undefined;
  const className = name.trim().replace(/^class\b/i, "Kelas");
  const hasBranch = branchName?.trim() && className.toLowerCase().includes(branchName.trim().toLowerCase());
  const label = branchName?.trim() && !hasBranch ? `${className} · ${branchName.trim()}` : className;
  return label.startsWith("Kelas ") ? label : `Kelas ${label}`;
}

export function activeClassStudent(
  embedded: ApiClassStudent[] = [],
  fetched: ApiClassStudent[] = [],
) {
  return [...embedded, ...fetched].find((relation) => relation.is_current === true);
}

function nameFromTeacher(value?: ApiClassTeacher | string | number) {
  if (typeof value === "string") return value.trim() || undefined;
  if (!value || typeof value === "number") return undefined;
  const staff = value.staff;
  return value.teacher_name || value.name || staff?.name ||
    [value.first_name || staff?.first_name, value.last_name || staff?.last_name].filter(Boolean).join(" ") || undefined;
}

async function teacherForActivity(activity: ApiActivity, cache: Map<string, Promise<ApiClassTeacher | null>>) {
  const directName = activity.teacher_name || nameFromTeacher(activity.teacher) || nameFromTeacher(activity.class_teacher as ApiClassTeacher | number | undefined);
  if (directName) return directName;
  const assignmentId = activity.class_teacher_id ?? (typeof activity.class_teacher === "number" || typeof activity.class_teacher === "string" ? activity.class_teacher : activity.class_teacher?.id);
  if (!assignmentId) return "Nama guru belum tersedia";
  const key = String(assignmentId);
  let lookup = cache.get(key);
  if (!lookup) {
    lookup = get<ApiClassTeacher>(`/api/class-teachers/${encodeURIComponent(key)}/`);
    cache.set(key, lookup);
  }
  const assignment = await lookup;
  return nameFromTeacher(assignment || undefined) || "Nama guru belum tersedia";
}

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

type ApiResult<T> = { status: number; data: T | null };

/** GET with the session's access token; `null` when no backend or session is configured. Throws on network errors. */
async function authorizedGet(url: string | URL) {
  const accessToken = (await cookies()).get(SESSION_COOKIES.accessToken)?.value;
  if (!accessToken) return null;
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
}

/** Fetches a backend resource and keeps the HTTP status so callers can tell "not found" apart from "could not reach the API". Status 0 means no API/session or a network failure. */
async function getWithStatus<T>(path: string): Promise<ApiResult<T>> {
  const url = backendUrl(path);
  if (!url) return { status: 0, data: null };
  try {
    const response = await authorizedGet(url);
    if (!response) return { status: 0, data: null };
    if (!response.ok) return { status: response.status, data: null };
    return { status: response.status, data: (await response.json()) as T };
  } catch {
    return { status: 0, data: null };
  }
}

async function get<T>(path: string): Promise<T | null> {
  return (await getWithStatus<T>(path)).data;
}

/** Every item of a paginated list, following `next` links on the backend's own origin (at most 100 pages). */
async function getAll<T>(path: string): Promise<T[]> {
  const apiBase = backendOrigin();
  if (!apiBase) return [];

  const baseOrigin = new URL(apiBase).origin;
  let nextUrl: string | null = new URL(path, `${apiBase}/`).toString();
  const visited = new Set<string>();
  const items: T[] = [];

  try {
    while (nextUrl && !visited.has(nextUrl) && visited.size < 100) {
      const pageUrl: URL = new URL(nextUrl);
      if (pageUrl.origin !== baseOrigin || !pageUrl.pathname.startsWith("/api/")) break;
      visited.add(nextUrl);

      const response = await authorizedGet(pageUrl);
      if (!response?.ok) break;

      const payload = await response.json() as unknown;
      if (Array.isArray(payload)) {
        items.push(...payload as T[]);
        break;
      }
      const page = payload as { results?: unknown; data?: unknown; next?: unknown } | null;
      const pageItems = Array.isArray(page?.results) ? page.results : Array.isArray(page?.data) ? page.data : null;
      if (!pageItems) break;
      items.push(...pageItems as T[]);
      nextUrl = typeof page?.next === "string" ? new URL(page.next, pageUrl).toString() : null;
    }
  } catch {
    return items;
  }

  return items;
}

export async function studentForBackend(studentId: number, fallback: ChildProfile) {
  const identity = await sessionIdentity();
  const linkedStudent = identity?.students?.find((student) => student.id === studentId);
  const fallbackName = linkedStudent?.name || "Siswa";
  fallback = {
    ...fallback,
    name: fallbackName,
    firstName: fallbackName.split(" ")[0],
    nickname: linkedStudent?.nickname || fallbackName.split(" ")[0],
    initials: linkedStudent?.initials || "S",
  };
  const [item, classStudentPayload] = await Promise.all([
    get<ApiStudent>(`/api/students/${studentId}/`),
    get<ApiClassStudent[] | { results?: ApiClassStudent[] }>(`/api/class-students/?student_id=${studentId}&is_current=true`),
  ]);
  const classStudentRecords = records<ApiClassStudent>(classStudentPayload)
    .filter((relation) => Number(relation.student_id ?? relation.student) === studentId);
  const classAssignment = activeClassStudent(item?.class_students, classStudentRecords);
  const classId = classAssignment?.class_id;
  const classRecord = classId ? await get<ApiClass>(`/api/classes/${encodeURIComponent(String(classId))}/`) : null;
  const className = formatClassLabel(classRecord?.name || classAssignment?.class_name, classRecord?.branch_name)
    || "Kelas belum tersedia";
  const classFields = { className, classCode: className, classId: positiveId(classId), branchId: positiveId(classRecord?.branch) };
  if (!item?.id) return { ...fallback, ...classFields };
  const name = fullName(item.first_name, item.middle_name, item.last_name) || fallback.name;
  return { ...fallback, name, firstName: item.first_name || fallback.firstName, nickname: item.nickname || item.first_name || fallback.firstName, initials: initialsOf(name), ...classFields, id: fallback.id };
}

/** The value as a positive integer id, or undefined. */
function positiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * The child selected for this request: its profile, its backend id (as a string for links and as a number
 * for API calls) and the query string that keeps it selected on dashboard links.
 */
export async function selectedStudentForRequest() {
  const fallback = getChild();
  const numericStudentId = await sessionStudentId();
  const child = numericStudentId ? await studentForBackend(numericStudentId, fallback) : fallback;
  const studentId = numericStudentId ? String(numericStudentId) : undefined;
  return { child, studentId, numericStudentId, childQuery: childQueryFor(studentId, child.id) };
}

/** Name of the guardian the school addresses for this student: the primary guardian, like the verification email, else the first linked one. */
export async function primaryGuardianNameForStudent(studentId: number) {
  const student = await get<ApiStudent>(`/api/students/${studentId}/`);
  return primaryGuardianName(student?.student_guardians);
}

export async function studentsForGuardian(guardianId: number) {
  const records = await get<ApiStudent[]>(`/api/students/?guardian_id=${guardianId}`);
  if (!Array.isArray(records)) return [];
  return records.filter((student): student is ApiStudent & { id: number } => typeof student.id === "number").map((student) => {
    const name = fullName(student.first_name, student.middle_name, student.last_name) || "Siswa";
    return { id: student.id, name, nickname: student.nickname || student.first_name, initials: initialsOf(name) };
  });
}

export async function schoolForBackend(studentId: number) {
  const student = await get<ApiStudent>(`/api/students/${studentId}/`);
  if (!student?.id) return null;

  let assignments = student.class_students || [];
  if (!assignments.length) {
    assignments = (await getAll<ApiClassStudent>(`/api/class-students/?student_id=${studentId}`))
      .filter((item) => Number(item.student_id ?? item.student) === studentId);
  }

  const classForAssignment = async (assignment: ApiClassStudent) => {
    if (assignment.class?.branch != null) return assignment.class;
    const classId = assignment.class_id ?? assignment.class?.id;
    return classId == null
      ? null
      : get<ApiClass>(`/api/classes/${encodeURIComponent(String(classId))}/`);
  };
  const currentAssignments = assignments.filter((item) => item.is_current === true);
  const hasCurrentAssignments = currentAssignments.length > 0;
  const resolvedClasses = (await Promise.all(currentAssignments.map(classForAssignment)))
    .filter((item): item is ApiClass => Boolean(item?.branch));
  const branchIds = [...new Set(resolvedClasses.map((item) => Number(item.branch)).filter((id) => Number.isInteger(id) && id > 0))];

  let branch: ApiBranch | undefined;
  let selectedClass: ApiClass | undefined;
  if (hasCurrentAssignments && branchIds.length === 1) {
    branch = await get<ApiBranch>(`/api/branches/${encodeURIComponent(String(branchIds[0]))}/`) || undefined;
    selectedClass = resolvedClasses.find((item) => Number(item.branch) === branchIds[0]);
  } else if (hasCurrentAssignments && branchIds.length > 1 && student.location_id != null) {
    const allBranches = await getAll<ApiBranch>("/api/branches/");
    const locationBranches = allBranches.filter((item) => Number(item.location_id) === Number(student.location_id));
    const matchingBranchIds = branchIds.filter((id) => locationBranches.some((item) => Number(item.id) === id));
    if (matchingBranchIds.length === 1) {
      branch = locationBranches.find((item) => Number(item.id) === matchingBranchIds[0]);
      selectedClass = resolvedClasses.find((item) => Number(item.branch) === matchingBranchIds[0]);
    }
  } else if (!hasCurrentAssignments && student.location_id != null) {
    // Old class assignments may belong to a previous branch. When there is no
    // explicitly current class, use the student's location only if it points
    // to one branch; never treat the first historical class as current.
    const allBranches = await getAll<ApiBranch>("/api/branches/");
    const locationBranches = allBranches.filter((item) => Number(item.location_id) === Number(student.location_id));
    if (locationBranches.length === 1) branch = locationBranches[0];
  }

  if (!branch?.id && hasCurrentAssignments && student.location_id != null && branchIds.length === 1) {
    const allBranches = await getAll<ApiBranch>("/api/branches/");
    branch = allBranches.find((item) => Number(item.id) === branchIds[0]);
  }
  if (!branch?.school) return null;

  const school = await get<ApiSchool>(`/api/schools/${encodeURIComponent(String(branch.school))}/`);
  if (!school) return null;

  let academicYear = selectedClass?.academic_year_name;
  if (!academicYear && selectedClass?.academic_year != null) {
    const year = await get<ApiAcademicYear>(`/api/academic-years/${encodeURIComponent(String(selectedClass.academic_year))}/`);
    if (year && Number(year.branch) === Number(branch.id)) academicYear = year.name;
  }
  if (!academicYear) {
    const academicYears = await getAll<ApiAcademicYear>(`/api/academic-years/?branch_id=${encodeURIComponent(String(branch.id))}&is_current=true`);
    academicYear = academicYears.find((year) => year.is_current && Number(year.branch) === Number(branch.id))?.name;
  }

  return {
    ...school,
    address: branch.address,
    phone_number: branch.phone,
    email: branch.email,
    branch_name: branch.name,
    branch_id: Number(branch.id) || undefined,
    academic_year: academicYear,
    payment_gateway_enabled: Boolean(branch.is_payment_gateway_enabled),
  } satisfies GuardianSchool;
}

/** Whether the selected child's branch offers online payment through the gateway. */
export async function paymentGatewayForStudent(studentId?: number): Promise<{ enabled: boolean; branchId?: number }> {
  if (!studentId) return { enabled: false };
  const school = await schoolForBackend(studentId).catch(() => null);
  return { enabled: Boolean(school?.payment_gateway_enabled), branchId: school?.branch_id };
}

export async function guardianForBackend(guardianId?: number, userId?: number, email?: string) {
  if (guardianId) {
    const guardian = await get<ApiGuardian>(`/api/guardians/${guardianId}/`);
    if (guardian?.id) return guardian;
  }
  const payload = await get<ApiGuardian[] | { results?: ApiGuardian[] }>("/api/guardians/");
  return records<ApiGuardian>(payload).find((guardian) =>
    (guardianId && Number(guardian.id) === guardianId)
    || (userId && guardianUserId(guardian) === userId)
    || (email && guardian.email?.toLowerCase() === email.toLowerCase()),
  ) || null;
}

function statusTone(value?: string): Invoice["statusTone"] {
  const normalized = String(value || "").toLowerCase();
  if (["paid", "paid_full", "verified", "approved", "completed", "lunas"].includes(normalized)) return "success";
  if (["partial", "partially_paid", "sebagian"].some((status) => normalized.includes(status))) return "partial";
  if (["late", "overdue", "terlambat"].some((status) => normalized.includes(status))) return "late";
  return "warning";
}

/** Backend activity → card/detail view. Missing fields get neutral defaults, never invented content. */
function mapActivity(item: ApiActivity, { childId, slug, studentId, teacher, noteFallback }: { childId: ChildId; slug: string; studentId?: number; teacher: string; noteFallback: string }): Activity {
  const visibleImages = imagesForStudent(item.activity_images, studentId);
  const description = item.description || "Catatan aktivitas dari sekolah.";
  return {
    childId,
    slug,
    title: item.name || "Aktivitas sekolah",
    date: formatLongDate(item.activity_date, "Tanggal belum tersedia"),
    time: formatTime(item.activity_date),
    emoji: "🎨",
    secondaryEmoji: "📷",
    tone: "mint",
    photos: visibleImages.length,
    summary: description,
    description,
    teacher,
    // The note is the teacher's caption on this child's own photos; the description is shown separately.
    teacherNote: studentCaption(item.activity_images, studentId) || noteFallback,
    skills: [],
    imageUrls: visibleImages.map((image) => image.image_url).filter((url): url is string => Boolean(url)),
    occurredAt: item.activity_date || item.updated_at || item.created_at,
  };
}

export async function activitiesForBackend(childId: ChildId, studentId?: number) {
  const filters = new URLSearchParams();
  if (studentId !== undefined) filters.set("student_id", String(studentId));
  filters.set("is_publish", "true");
  const items = recordsOrNull<ApiActivity>(await get(`/api/activities/?${filters.toString()}`)) || [];
  const visible = items
    .filter((item) => item.is_publish !== false)
    .filter((item) => !studentId || activityMatchesStudent(item, studentId));
  const teacherCache = new Map<string, Promise<ApiClassTeacher | null>>();
  return Promise.all(visible.map(async (item, index) => mapActivity(item, {
    childId,
    studentId,
    slug: String(item.id ?? item.name ?? `activity-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    teacher: await teacherForActivity(item, teacherCache),
    noteFallback: "Informasi aktivitas tersedia dari sekolah.",
  })));
}

export async function activityForBackend(slug: string, childId: ChildId, studentId?: number) {
  const suffix = studentId ? `?student_id=${studentId}` : "";
  const item = await get<ApiActivity>(`/api/activities/${encodeURIComponent(slug)}/${suffix}`);
  if (!item || item.is_publish === false) return null;
  if (studentId && !activityMatchesStudent(item, studentId)) return null;
  return mapActivity(item, { childId, slug, studentId, teacher: await teacherForActivity(item, new Map()), noteFallback: "Belum ada catatan khusus dari guru." });
}

/** A row of `GET /api/gateway/invoices/?student_id=` (backend PayableInvoiceSerializer). */
type ApiPayableInvoice = {
  id?: number;
  payable?: boolean;
  not_payable_reason?: string | null;
  locked_until?: string | null;
  active_gateway_payment_id?: number | null;
};
type GatewayPayability = Map<string, ApiPayableInvoice>;

/**
 * Online-payment state of the student's invoices, keyed by invoice id: whether each one can be
 * paid online and which pending checkout locks it. The invoice endpoints do not carry this.
 * `null` when it could not be read; the bills then keep their own state and the backend still
 * rejects a locked invoice at checkout.
 */
async function gatewayPayabilityFor(studentId?: number): Promise<GatewayPayability | null> {
  if (!studentId) return null;
  const payload = await get<{ invoices?: ApiPayableInvoice[] }>(`/api/gateway/invoices/?student_id=${studentId}`);
  if (!Array.isArray(payload?.invoices)) return null;
  return new Map(payload.invoices.filter((row) => row.id != null).map((row) => [String(row.id), row]));
}

function withGatewayPayability(invoice: Invoice, payability: GatewayPayability | null): Invoice {
  const row = payability?.get(invoice.slug);
  if (!row) return invoice;
  return {
    ...invoice,
    payableViaGateway: row.payable === true,
    pendingGatewayPayment: row.active_gateway_payment_id
      ? { id: row.active_gateway_payment_id, expiresAt: row.locked_until || undefined }
      : undefined,
  };
}

/** Resolves to the guardian's bills, or `null` when the backend could not be read (expired session, outage). */
export async function invoicesForBackend(childId: ChildId, studentId?: number): Promise<Invoice[] | null> {
  const [payload, payability] = await Promise.all([
    get(studentId ? `/api/student-invoices/?student_id=${studentId}` : "/api/student-invoices/"),
    gatewayPayabilityFor(studentId),
  ]);
  const items = recordsOrNull<ApiInvoice>(payload);
  if (!items) return null;
  return items
    .filter((item) => !studentId || Number(item.student_id) === studentId)
    .map((item) => withGatewayPayability(mapInvoice(item, childId), payability));
}

export async function notificationsForBackend(studentId?: number): Promise<GuardianNotification[]> {
  if (!studentId) return [];
  const filters = new URLSearchParams({ student_id: String(studentId), is_publish: "true" });
  const [activitiesPayload, invoicesPayload] = await Promise.all([
    get<ApiActivity[] | { results?: ApiActivity[] }>(`/api/activities/?${filters.toString()}`),
    get<ApiInvoice[] | { results?: ApiInvoice[] }>(`/api/student-invoices/?student_id=${studentId}`),
  ]);
  const activityItems = records<ApiActivity>(activitiesPayload).filter((item) => item.is_publish !== false && activityMatchesStudent(item, studentId));
  const invoiceItems = records<ApiInvoice>(invoicesPayload).filter((item) => Number(item.student_id) === studentId);
  const teacherCache = new Map<string, Promise<ApiClassTeacher | null>>();
  const activityNotifications = await Promise.all(activityItems.map(async (item): Promise<GuardianNotification | null> => {
    if (!item.id) return null;
    const teacher = await teacherForActivity(item, teacherCache);
    const occurredAt = item.updated_at || item.created_at || item.activity_date;
    return {
      id: `activity:${item.id}:${occurredAt || item.name || "update"}`,
      kind: "activity",
      title: item.name || "Aktivitas baru",
      copy: `${teacher} membagikan aktivitas baru.`,
      href: `/dashboard/activities/${String(item.id)}`,
      occurredAt,
    };
  }));
  const paymentNotifications = invoiceItems.map((item): GuardianNotification | null => {
    if (!item.id) return null;
    const occurredAt = item.updated_at || item.created_at || item.invoice_date;
    const month = formatMonthYear(item.invoice_date, item.invoice_no || "Tagihan");
    const status = item.status ? titleize(item.status) : "Status diperbarui";
    const payment = item.payment || latestPayment(item.payments);
    const invoiceStatus = String(item.status || "").toLowerCase();
    const rejected = payment?.status === "rejected" && invoiceStatus === "unpaid";
    const verified = invoiceStatus === "paid" || (isVerifiedPayment(payment) && invoiceStatus !== "unpaid");
    const copy = rejected
      ? `Pembayaran Anda ditolak. ${payment.rejection_reason ? `Alasan: ${asSentence(payment.rejection_reason)} ` : ""}Status tagihan kembali menjadi belum dibayar. Silakan unggah ulang bukti pembayaran atau hubungi pihak sekolah.`
      : verified
        ? "Pembayaran Anda telah diverifikasi. Status tagihan telah diperbarui menjadi lunas."
        : invoiceStatus === "payment_submitted"
          ? "Bukti pembayaran Anda telah dikirim dan sedang menunggu verifikasi dari pihak sekolah."
          : invoiceStatus === "unpaid"
            ? "Tagihan Anda belum dibayar. Silakan unggah bukti pembayaran untuk melanjutkan."
            : `Status tagihan Anda: ${status.toLowerCase()}.`;
    return {
      id: `payment:${item.id}:${occurredAt || status}`,
      kind: "payment",
      title: `Tagihan ${month}`,
      copy,
      href: `/dashboard/payments/${item.id}`,
      occurredAt,
    };
  });
  return [...activityNotifications, ...paymentNotifications]
    .filter((item): item is GuardianNotification => item !== null)
    .sort((a, b) => Date.parse(b.occurredAt || "") - Date.parse(a.occurredAt || ""))
    .slice(0, 10);
}

function mapInvoice(item: ApiInvoice, childId: ChildId, payment = item.payment || latestPayment(item.payments)): Invoice {
  const billAmount = Number(item.total_amount || item.subtotal || 0);
  const paidAmount = Number(item.amount_paid || 0);
  const remaining = remainingAmount({ billAmount, paidAmount });
  const paid = paidAmount >= billAmount && billAmount > 0;
  const apiStatus = item.status;
  const state = invoicePaymentState({ status: apiStatus || "", billAmount, paidAmount });
  const verified = state === "paid" && isVerifiedPayment(payment);
  const rejected = state === "unpaid" && payment?.status === "rejected";
  const paymentDate = state === "paid" ? item.paid_at || item.payment_date || payment?.paid_at || payment?.payment_date : undefined;
  const paymentDateTime = (value?: string) => formatDateTime(value, { zoneName: false });
  const money = (value: number) => rupiah(value, item.currency || "IDR");
  return {
    childId,
    slug: String(item.id ?? item.invoice_no ?? "invoice"),
    month: formatMonthYear(item.invoice_date, item.invoice_no || "Tagihan"),
    feeType: item.fee_type?.name?.trim() || item.fee_type_name?.trim() || "Biaya sekolah",
    amount: money(remaining),
    billAmount,
    paidAmount,
    dueDate: formatLongDate(item.due_date, "Belum tersedia"),
    status: apiStatus ? titleize(apiStatus) : paid ? "Lunas" : paidAmount > 0 ? `Sebagian · sisa ${money(remaining)}` : "Menunggu pembayaran",
    statusTone: apiStatus ? statusTone(apiStatus) : paid ? "success" : paidAmount > 0 ? "partial" : "warning",
    method: titleize(item.payment_method || payment?.payment_method),
    paidAt: paymentDateTime(paymentDate),
    fine: "Tidak ada",
    paymentSubmitted: state === "submitted",
    paymentId: payment?.id,
    paymentMethod: payment?.payment_method,
    rejectionReason: rejected ? payment.rejection_reason || "Bukti pembayaran belum dapat diverifikasi." : undefined,
    verifiedAt: verified ? paymentDateTime(payment?.verified_at || paymentDate) : "—",
    proofUrl: verified ? verifiedPaymentProofUrl(payment) : undefined,
    invoiceNo: item.invoice_no?.trim() || undefined,
    invoiceDate: item.invoice_date || item.created_at,
    studentId: item.student_id,
    // Refined by GET gateway/invoices (withGatewayPayability), which also knows about locks.
    payableViaGateway: state === "unpaid",
  };
}

export type InvoiceLookup =
  | { state: "found"; invoice: Invoice }
  /** The backend answered and the bill does not exist (or is not this guardian's). */
  | { state: "missing" }
  /** The backend could not be reached or rejected the session; the bill may still exist. */
  | { state: "unavailable" };

export async function invoiceLookupForBackend(invoiceId: string, childId: ChildId): Promise<InvoiceLookup> {
  const { status, data: item } = await getWithStatus<ApiInvoice | { results?: ApiInvoice[] }>(`/api/student-invoices/${encodeURIComponent(invoiceId)}/`);
  const record: ApiInvoice | undefined = item && typeof item === "object" && "results" in item ? item.results?.[0] : item as ApiInvoice | null || undefined;
  if (!record) return status === 404 || status === 403 ? { state: "missing" } : { state: "unavailable" };
  const [paymentPayload, payability] = await Promise.all([
    get(`/api/payments/?student_invoice_id=${encodeURIComponent(invoiceId)}`),
    gatewayPayabilityFor(positiveId(record.student_id)),
  ]);
  const payment = latestPayment(records<ApiPayment>(paymentPayload));
  const invoice = payment ? mapInvoice(record, childId, payment) : mapInvoice(record, childId);
  return { state: "found", invoice: withGatewayPayability(invoice, payability) };
}

export async function invoiceForBackend(invoiceId: string, childId: ChildId) {
  const lookup = await invoiceLookupForBackend(invoiceId, childId);
  return lookup.state === "found" ? lookup.invoice : undefined;
}
