// The bell menu: recent activities and bill updates for the selected child, read on the server.
import { asSentence, formatMonthYear, titleize } from "@/lib/format";
import { publishedActivitiesFor, teacherForActivity, type TeacherCache } from "@/features/activities/api";
import type { ApiActivity } from "@/features/activities/types";
import { studentInvoicesFor } from "@/features/payments/api";
import { isVerifiedPayment, latestPayment } from "@/features/payments/helpers";
import type { ApiInvoice } from "@/features/payments/types";

export type GuardianNotification = {
  id: string;
  kind: "activity" | "payment";
  title: string;
  copy: string;
  href: string;
  occurredAt?: string;
};

async function activityNotification(item: ApiActivity, teacherCache: TeacherCache): Promise<GuardianNotification | null> {
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
}

function paymentNotification(item: ApiInvoice): GuardianNotification | null {
  if (!item.id) return null;
  const occurredAt = item.updated_at || item.created_at || item.invoice_date;
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
    title: `Tagihan ${formatMonthYear(item.invoice_date, item.invoice_no || "Tagihan")}`,
    copy,
    href: `/dashboard/payments/${item.id}`,
    occurredAt,
  };
}

/** The 10 most recent updates for the child, newest first. */
export async function notificationsForBackend(studentId?: number): Promise<GuardianNotification[]> {
  if (!studentId) return [];
  const [activities, invoices] = await Promise.all([publishedActivitiesFor(studentId), studentInvoicesFor(studentId)]);
  const teacherCache: TeacherCache = new Map();
  const notifications = [
    ...await Promise.all(activities.map((item) => activityNotification(item, teacherCache))),
    ...(invoices || []).map(paymentNotification),
  ];
  return notifications
    .filter((item): item is GuardianNotification => item !== null)
    .sort((a, b) => Date.parse(b.occurredAt || "") - Date.parse(a.occurredAt || ""))
    .slice(0, 10);
}
