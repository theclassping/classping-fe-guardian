import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import type { Activity, ChildId, Invoice } from "@/lib/data";

type ApiActivity = {
  id?: number;
  name?: string;
  description?: string;
  activity_date?: string;
  class_name?: string;
  activity_images?: { image_url?: string }[];
  is_publish?: boolean;
};

type ApiInvoice = {
  id?: number;
  invoice_no?: string;
  student_id?: number;
  student_name?: string;
  class_name?: string;
  invoice_date?: string;
  due_date?: string;
  status?: string;
  subtotal?: string;
  total_amount?: string;
  amount_paid?: string;
  currency?: string;
  payment_method?: string;
  paid_at?: string;
  payment_date?: string;
  created_at?: string;
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

type ApiStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string; class_students?: { class_name?: string; is_current?: boolean }[] };
type ApiSchool = { id?: number; name?: string; npsn?: string; address?: string; phone_number?: string; email?: string; description?: string; school_hours?: string; academic_year?: string };

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

export async function sessionStudentId(value?: string) {
  const queryId = Number(value);
  if (Number.isInteger(queryId) && queryId > 0) return queryId;
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  return identity.student_id ?? identity.students?.[0]?.id;
}

async function get<T>(path: string): Promise<T | null> {
  if (!apiBase) return null;
  const accessToken = (await cookies()).get("access_token")?.value;
  if (!accessToken || accessToken.startsWith("classping-guardian-demo")) return null;

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
  const item = await get<ApiStudent>(`/api/students/${studentId}/`);
  if (!item?.id) return fallback;
  const name = [item.first_name, item.middle_name, item.last_name].filter(Boolean).join(" ") || fallback.name;
  const currentClass = item.class_students?.find((entry) => entry.is_current) || item.class_students?.[0];
  return { ...fallback, name, firstName: item.first_name || fallback.firstName, nickname: item.nickname || item.first_name || fallback.firstName, className: currentClass?.class_name || fallback.className, classCode: currentClass?.class_name || fallback.classCode, id: fallback.id };
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
  const payload = await get<ApiSchool | ApiSchool[] | { results?: ApiSchool[] }>(`/api/schools/?student_id=${studentId}`);
  const school: ApiSchool | undefined = Array.isArray(payload)
    ? payload[0]
    : payload && "results" in payload
      ? payload.results?.[0]
      : payload as ApiSchool | null || undefined;
  return school || null;
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

export async function activitiesForBackend(childId: ChildId, fallback: Activity[], _studentId?: number) {
  const payload = await get<ApiActivity[] | { results?: ApiActivity[] }>("/api/activities/");
  const records = Array.isArray(payload) ? payload : payload?.results || null;
  if (!records) return fallback;
  const mapped = records
    .filter((item) => item.is_publish !== false)
    .map((item, index): Activity => ({
      childId,
      slug: String(item.id ?? item.name ?? `activity-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: item.name || "Aktivitas sekolah",
      date: item.activity_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.activity_date)) : "Tanggal belum tersedia",
      time: item.activity_date ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(item.activity_date)) : "",
      emoji: "🎨",
      secondaryEmoji: "📷",
      tone: "mint",
      photos: item.activity_images?.length || 0,
      summary: item.description || "Catatan aktivitas dari sekolah.",
      description: item.description || "Catatan aktivitas dari sekolah.",
      teacher: "Guru kelas",
      teacherNote: "Informasi aktivitas tersedia dari sekolah.",
      skills: [],
      imageUrls: (item.activity_images || []).map((image) => image.image_url).filter((url): url is string => Boolean(url)),
    }));
  return mapped;
}

export async function activityForBackend(slug: string, childId: ChildId, fallback: Activity) {
  const item = await get<ApiActivity>(`/api/activities/${encodeURIComponent(slug)}/`);
  if (!item || item.is_publish === false) return fallback;
  return {
    ...fallback,
    childId,
    slug,
    title: item.name || fallback.title,
    date: item.activity_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(item.activity_date)) : fallback.date,
    time: item.activity_date ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(item.activity_date)) : fallback.time,
    photos: item.activity_images?.length || 0,
    summary: item.description || fallback.summary,
    description: item.description || fallback.description,
    teacher: "Guru kelas",
    teacherNote: item.description || fallback.teacherNote,
    skills: [],
    imageUrls: (item.activity_images || []).map((image) => image.image_url).filter((url): url is string => Boolean(url)),
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
