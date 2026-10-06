import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { getChild } from "@/lib/data";
import type { Activity, ChildId, Invoice } from "@/lib/data";

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
};

type ApiClass = { id?: number | string; name?: string; branch?: number | string; branch_name?: string; academic_year?: number | string; academic_year_name?: string };

type ApiStudentLink = { id?: number | string; student_id?: number | string; student?: number | string };
type ApiActivityImage = { image_url?: string; student_id?: number | string | null; student_ids?: (number | string)[] };

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

function imagesForStudent(images: ApiActivityImage[] = [], studentId?: number) {
  if (!studentId) return images;
  const hasTagMetadata = images.some((image) => image.student_id != null || Array.isArray(image.student_ids));
  return hasTagMetadata ? images.filter((image) => imageStudentIds(image).includes(studentId)) : images;
}

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
  due_date?: string;
  status?: string;
  subtotal?: string;
  total_amount?: string;
  amount_paid?: string;
  currency?: string;
  payment_method?: string;
  paid_at?: string;
  payment_date?: string;
  payments?: { payment_method?: string; paid_at?: string; payment_date?: string; created_at?: string; amount?: string; status?: string; payment_status?: string; proofs?: { image_url?: string; url?: string; image_data?: { image_url?: string; url?: string } }[] }[];
};

type ApiPayment = {
  payment_method?: string;
  paid_at?: string;
  payment_date?: string;
  created_at?: string;
  status?: string;
  payment_status?: string;
  proofs?: { image_url?: string; url?: string; image_data?: { image_url?: string; url?: string } }[];
};

export type GuardianNotification = {
  id: string;
  kind: "activity" | "payment";
  title: string;
  copy: string;
  href: string;
  occurredAt?: string;
};

type ApiStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string; location_id?: number | string | null; class_students?: ApiClassStudent[] };
type ApiBranch = { id?: number | string; school?: number | string; name?: string; code?: string; address?: string; phone?: string; email?: string; location_id?: number | string };
type ApiSchool = { id?: number; name?: string; register_number?: string; image_data?: string; description?: string; branches?: ApiBranch[] };
type ApiGuardian = { id?: number | string; user?: number | string | { id?: number | string }; user_id?: number | string; name?: string; email?: string; phone_number?: string };
export type GuardianSchool = ApiSchool & { address?: string; phone_number?: string; email?: string; branch_name?: string; academic_year?: string };

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

function records<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function formatClassLabel(name?: string, branchName?: string) {
  if (!name) return undefined;
  const className = name.trim().replace(/^class\b/i, "Kelas");
  const hasBranch = branchName?.trim() && className.toLowerCase().includes(branchName.trim().toLowerCase());
  const label = branchName?.trim() && !hasBranch ? `${className} · ${branchName.trim()}` : className;
  return label.startsWith("Kelas ") ? label : `Kelas ${label}`;
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

export async function sessionStudentId() {
  const cookieStore = await cookies();
  const identity = decodeIdentity(cookieStore.get("guardian_identity")?.value);
  if (!identity) return undefined;
  const linkedIds = new Set([
    ...(identity.student_id ? [identity.student_id] : []),
    ...(identity.students || []).map((student) => student.id),
  ]);
  const currentId = Number(cookieStore.get("current_student_id")?.value);
  if (Number.isInteger(currentId) && linkedIds.has(currentId)) return currentId;
  return identity.student_id ?? identity.students?.[0]?.id;
}
async function get<T>(path: string): Promise<T | null> {
  if (!apiBase) return null;
  const accessToken = (await cookies()).get("access_token")?.value;
  if (!accessToken) return null;

  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function studentForBackend(studentId: number, fallback: import("@/lib/data").ChildProfile) {
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
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
  const classAssignment = item?.class_students?.find((entry) => entry.is_current)
    || item?.class_students?.[0]
    || classStudentRecords.find((entry) => entry.is_current)
    || classStudentRecords[0];
  const classId = classAssignment?.class_id;
  const classRecord = classId ? await get<ApiClass>(`/api/classes/${encodeURIComponent(String(classId))}/`) : null;
  const className = formatClassLabel(classRecord?.name || classAssignment?.class_name, classRecord?.branch_name)
    || "Kelas belum tersedia";
  if (!item?.id) {
    return { ...fallback, className, classCode: className };
  }
  const name = [item.first_name, item.middle_name, item.last_name].filter(Boolean).join(" ") || fallback.name;
  return { ...fallback, name, firstName: item.first_name || fallback.firstName, nickname: item.nickname || item.first_name || fallback.firstName, initials: name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), className, classCode: className, id: fallback.id };
}

export async function selectedStudentForRequest() {
  const fallback = getChild();
  const currentStudentId = await sessionStudentId();
  const child = currentStudentId ? await studentForBackend(currentStudentId, fallback) : fallback;
  return { child, studentId: currentStudentId ? String(currentStudentId) : undefined };
}

export async function studentsForGuardian(guardianId: number) {
  const records = await get<ApiStudent[]>(`/api/students/?guardian_id=${guardianId}`);
  if (!Array.isArray(records)) return [];
  return records.filter((student): student is ApiStudent & { id: number } => typeof student.id === "number").map((student) => {
    const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || "Siswa";
    return { id: student.id, name, nickname: student.nickname || student.first_name, initials: name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() };
  });
}

export async function schoolForBackend(studentId: number) {
  const student = await get<ApiStudent>(`/api/students/${studentId}/`);
  if (!student?.id) return null;

  let branch: ApiBranch | undefined;
  let academicYear: string | undefined;
  if (student.location_id != null) {
    const branchPayload = await get<ApiBranch[] | { results?: ApiBranch[] }>("/api/branches/");
    branch = records<ApiBranch>(branchPayload).find((item) => Number(item.location_id) === Number(student.location_id));
  }

  const assignmentPayload = await get<ApiClassStudent[] | { results?: ApiClassStudent[] }>(`/api/class-students/?student_id=${studentId}`);
  const assignments = records<ApiClassStudent>(assignmentPayload).filter((item) => Number(item.student_id ?? item.student) === studentId);
  const classes = await Promise.all(assignments.map((item) => get<ApiClass>(`/api/classes/${encodeURIComponent(String(item.class_id))}/`)));
  const resolvedClass = classes.find((item) => item && branch && Number(item.branch) === Number(branch.id))
    || classes.find(Boolean);
  if (resolvedClass) {
    academicYear = resolvedClass.academic_year_name;
    if (!branch && resolvedClass.branch) branch = await get<ApiBranch>(`/api/branches/${encodeURIComponent(String(resolvedClass.branch))}/`) || undefined;
    if (!academicYear && resolvedClass.academic_year) {
      const year = await get<{ name?: string }>(`/api/academic-years/${encodeURIComponent(String(resolvedClass.academic_year))}/`);
      academicYear = year?.name;
    }
  }
  if (!branch?.school) return null;

  const school = await get<ApiSchool>(`/api/schools/${encodeURIComponent(String(branch.school))}/`);
  if (!school) return null;
  return {
    ...school,
    address: branch.address,
    phone_number: branch.phone,
    email: branch.email,
    branch_name: branch.name,
    academic_year: academicYear,
  } satisfies GuardianSchool;
}

export async function guardianForBackend(guardianId?: number, userId?: number, email?: string) {
  if (guardianId) {
    const guardian = await get<ApiGuardian>(`/api/guardians/${guardianId}/`);
    if (guardian?.id) return guardian;
  }
  const payload = await get<ApiGuardian[] | { results?: ApiGuardian[] }>("/api/guardians/");
  return records<ApiGuardian>(payload).find((guardian) => {
    const linkedUserId = typeof guardian.user === "object" && guardian.user ? Number(guardian.user.id) : Number(guardian.user ?? guardian.user_id);
    return (guardianId && Number(guardian.id) === guardianId)
      || (userId && linkedUserId === userId)
      || (email && guardian.email?.toLowerCase() === email.toLowerCase());
  }) || null;
}

function childMatches(childId: ChildId, className = "", studentName = "") {
  const haystack = `${className} ${studentName}`.toLowerCase();
  return childId === "alya" ? haystack.includes("a1") || haystack.includes("alya") : haystack.includes("b2") || haystack.includes("jisindo");
}

function titleizePaymentMethod(value?: string) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleizeStatus(value?: string) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value?: string): Invoice["statusTone"] {
  const normalized = String(value || "").toLowerCase();
  if (["paid", "paid_full", "verified", "approved", "completed", "lunas"].some((status) => normalized.includes(status))) return "success";
  if (["partial", "partially_paid", "sebagian"].some((status) => normalized.includes(status))) return "partial";
  if (["late", "overdue", "terlambat"].some((status) => normalized.includes(status))) return "late";
  return "warning";
}

function humanizePaymentDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function activitiesForBackend(childId: ChildId, fallback: Activity[], studentId?: number) {
  const filters = new URLSearchParams();
  if (studentId !== undefined) filters.set("student_id", String(studentId));
  filters.set("is_publish", "true");
  const payload = await get<ApiActivity[] | { results?: ApiActivity[] }>(`/api/activities/?${filters.toString()}`);
  const records = Array.isArray(payload) ? payload : payload?.results || null;
  if (!records) return studentId ? [] : fallback;
  const visibleRecords = records
    .filter((item) => item.is_publish !== false)
    .filter((item) => !studentId || activityMatchesStudent(item, studentId));
  const teacherCache = new Map<string, Promise<ApiClassTeacher | null>>();
  const mapped = await Promise.all(visibleRecords.map(async (item, index): Promise<Activity> => {
      const visibleImages = imagesForStudent(item.activity_images, studentId);
      return {
      childId,
      slug: String(item.id ?? item.name ?? `activity-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: item.name || "Aktivitas sekolah",
      date: item.activity_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.activity_date)) : "Tanggal belum tersedia",
      time: item.activity_date ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(item.activity_date)) : "",
      emoji: "🎨",
      secondaryEmoji: "📷",
      tone: "mint",
      photos: visibleImages.length,
      summary: item.description || "Catatan aktivitas dari sekolah.",
      description: item.description || "Catatan aktivitas dari sekolah.",
      teacher: await teacherForActivity(item, teacherCache),
      teacherNote: "Informasi aktivitas tersedia dari sekolah.",
      skills: [],
      imageUrls: visibleImages.map((image) => image.image_url).filter((url): url is string => Boolean(url)),
      };
    }));
  return mapped;
}

export async function activityForBackend(slug: string, childId: ChildId, fallback: Activity, studentId?: number) {
  const suffix = studentId ? `?student_id=${studentId}` : "";
  const item = await get<ApiActivity>(`/api/activities/${encodeURIComponent(slug)}/${suffix}`);
  if (!item || item.is_publish === false) return studentId ? null : fallback;
  if (studentId && !activityMatchesStudent(item, studentId)) return null;
  const visibleImages = imagesForStudent(item.activity_images, studentId);
  const teacher = await teacherForActivity(item, new Map());
  return {
    ...fallback,
    childId,
    slug,
    title: item.name || fallback.title,
    date: item.activity_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.activity_date)) : fallback.date,
    time: item.activity_date ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(item.activity_date)) : fallback.time,
    photos: visibleImages.length,
    summary: item.description || fallback.summary,
    description: item.description || fallback.description,
    teacher,
    teacherNote: item.description || fallback.teacherNote,
    skills: [],
    imageUrls: visibleImages.map((image) => image.image_url).filter((url): url is string => Boolean(url)),
  } as Activity;
}

export async function invoicesForBackend(childId: ChildId, fallback: Invoice[], studentId?: number) {
  const payload = await get<ApiInvoice[] | { results?: ApiInvoice[] }>(studentId ? `/api/student-invoices/?student_id=${studentId}` : "/api/student-invoices/");
  const records = Array.isArray(payload) ? payload : payload?.results || null;
  if (!records) return fallback;
  const mapped = records
    .filter((item) => studentId ? Number(item.student_id) === studentId : childMatches(childId, item.class_name, item.student_name))
    .map((item) => mapInvoice(item, childId));
  return mapped;
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
    const month = item.invoice_date ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(item.invoice_date)) : item.invoice_no || "Tagihan";
    const status = item.status ? titleizeStatus(item.status) : "Status diperbarui";
    return {
      id: `payment:${item.id}:${occurredAt || status}`,
      kind: "payment",
      title: `Tagihan ${month}`,
      copy: `Status pembayaran: ${status}.`,
      href: `/dashboard/payments/${item.id}`,
      occurredAt,
    };
  });
  return [...activityNotifications, ...paymentNotifications]
    .filter((item): item is GuardianNotification => item !== null)
    .sort((a, b) => Date.parse(b.occurredAt || "") - Date.parse(a.occurredAt || ""))
    .slice(0, 10);
}

function mapInvoice(item: ApiInvoice, childId: ChildId): Invoice {
  const billAmount = Number(item.total_amount || item.subtotal || 0);
  const paidAmount = Number(item.amount_paid || 0);
  const paid = paidAmount >= billAmount && billAmount > 0;
  const latestPayment = item.payments?.[item.payments.length - 1];
  const paymentMethod = item.payment_method || latestPayment?.payment_method;
  const paymentStatus = String(latestPayment?.status || latestPayment?.payment_status || item.status || "").toLowerCase();
  const verified = ["verified", "approved"].some((status) => paymentStatus.includes(status));
  const apiStatus = item.status;
  const paymentDate = verified
    ? item.paid_at || item.payment_date || latestPayment?.paid_at || latestPayment?.payment_date || latestPayment?.created_at
    : latestPayment?.created_at || item.created_at;
  return {
    childId,
    slug: String(item.id ?? item.invoice_no ?? "invoice"),
    month: item.invoice_date ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(item.invoice_date)) : item.invoice_no || "Tagihan",
    amount: new Intl.NumberFormat("id-ID", { style: "currency", currency: item.currency || "IDR", maximumFractionDigits: 0 }).format(Math.max(0, billAmount - paidAmount)),
    billAmount,
    paidAmount,
    dueDate: item.due_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.due_date)) : "Belum tersedia",
    status: apiStatus ? titleizeStatus(apiStatus) : paid ? "Lunas" : paidAmount > 0 ? `Sebagian · sisa ${new Intl.NumberFormat("id-ID", { style: "currency", currency: item.currency || "IDR", maximumFractionDigits: 0 }).format(billAmount - paidAmount)}` : "Menunggu pembayaran",
    statusTone: apiStatus ? statusTone(apiStatus) : paid ? "success" : paidAmount > 0 ? "partial" : "warning",
    method: titleizePaymentMethod(paymentMethod),
    paidAt: humanizePaymentDate(paymentDate),
    fine: "Tidak ada",
    paymentSubmitted: Boolean(latestPayment),
    verifiedAt: verified ? humanizePaymentDate(paymentDate) : "—",
    proofUrl: latestPayment?.proofs?.[latestPayment.proofs.length - 1]?.image_url || latestPayment?.proofs?.[latestPayment.proofs.length - 1]?.url || latestPayment?.proofs?.[latestPayment.proofs.length - 1]?.image_data?.image_url || latestPayment?.proofs?.[latestPayment.proofs.length - 1]?.image_data?.url,
  } as Invoice;
}

export async function invoiceForBackend(invoiceId: string, childId: ChildId, fallback?: Invoice) {
  const item = await get<ApiInvoice | { results?: ApiInvoice[] }>(`/api/student-invoices/${encodeURIComponent(invoiceId)}/`);
  const record: ApiInvoice | undefined = item && typeof item === "object" && "results" in item ? item.results?.[0] : item as ApiInvoice | null || undefined;
  if (!record) return fallback;
  const invoice = mapInvoice(record, childId);
  const paymentPayload = await get<ApiPayment[] | { results?: ApiPayment[] }>(`/api/payments/?student_invoice_id=${encodeURIComponent(invoiceId)}`);
  const payments = Array.isArray(paymentPayload) ? paymentPayload : paymentPayload?.results || [];
  const latestPayment = payments[payments.length - 1];
  if (!latestPayment) return invoice;
  return {
    ...invoice,
    method: titleizePaymentMethod(latestPayment.payment_method) || invoice.method,
    paidAt: humanizePaymentDate(latestPayment.paid_at || latestPayment.payment_date || latestPayment.created_at) || invoice.paidAt,
    paymentSubmitted: true,
    status: invoice.status,
    statusTone: invoice.statusTone,
    verifiedAt: ["verified", "approved"].some((status) => String(latestPayment.status || latestPayment.payment_status || "").toLowerCase().includes(status)) ? humanizePaymentDate(latestPayment.paid_at || latestPayment.payment_date) : "—",
    proofUrl: latestPayment.proofs?.[latestPayment.proofs.length - 1]?.image_url || latestPayment.proofs?.[latestPayment.proofs.length - 1]?.url || latestPayment.proofs?.[latestPayment.proofs.length - 1]?.image_data?.image_url || latestPayment.proofs?.[latestPayment.proofs.length - 1]?.image_data?.url,
  } as Invoice;
}
