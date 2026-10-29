import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ReceiptText, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PaymentReceiptDialog from "@/components/PaymentReceiptDialog";
import PaymentVerificationStatus from "@/components/PaymentVerificationStatus";
import { decodeIdentity } from "@/lib/auth";
import { activitiesFor, invoicesFor } from "@/lib/data";
import { activitiesForBackend, guardianForBackend, invoicesForBackend, selectedStudentForRequest } from "@/lib/backend";
import { greetingFor, latestActivity, latestOpenInvoice } from "@/lib/dashboard";

function currentDate() {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
}

export default async function GuardianDashboard() {
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  const { child, studentId } = await selectedStudentForRequest();
  const numericStudentId = studentId ? Number(studentId) : undefined;
  const [activities, invoices, guardian] = await Promise.all([
    activitiesForBackend(child.id, activitiesFor(child.id), numericStudentId),
    invoicesForBackend(child.id, invoicesFor(child.id), numericStudentId),
    identity ? guardianForBackend(identity.guardian_id, identity.id, identity.email) : Promise.resolve(null),
  ]);
  const guardianName = guardian?.name?.trim() || identity?.name?.trim() || "Bapak/Ibu Wali";
  const childQuery = studentId ? `?student_id=${studentId}` : `?child=${child.id}`;
  const openBill = latestOpenInvoice(invoices);
  const activity = latestActivity(activities);
  const activityImage = activity?.imageUrls?.[0];

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={currentDate()}
        title={`${greetingFor()}, ${guardianName}! 👋`}
        description={`Tagihan dan aktivitas terbaru ${child.firstName} dalam satu tempat.`}
      />

      <section className="child-hero panel">
        <div className="child-avatar">{child.initials}</div>
        <div className="child-identity">
          <span className="active-chip">Siswa aktif</span>
          <h2>{child.name}</h2>
          <p>{child.className} · NIS {child.nis}</p>
        </div>
        <Link href={`/dashboard/activities${childQuery}`}>Lihat aktivitas <ArrowRight /></Link>
      </section>

      <section className="dashboard-content dashboard-overview">
        <article className="fee-card panel" aria-labelledby="dashboard-bill-title">
          <div className="section-title"><div><span>SPP & TAGIHAN</span><h2 id="dashboard-bill-title">Tagihan terbaru</h2></div><ReceiptText /></div>
          {!invoices ? (
            <p className="fine-note">Tagihan belum dapat dimuat saat ini. Silakan coba lagi beberapa saat.</p>
          ) : openBill ? (
            <>
              <div className="next-bill">
                <span>{openBill.invoice.feeType} · {openBill.invoice.month}</span>
                <strong>{openBill.invoice.amount}</strong>
                <small><Clock3 /> Jatuh tempo {openBill.invoice.dueDate}</small>
              </div>
              {openBill.invoice.rejectionReason && (
                <div className="payment-rejection-message" role="alert">
                  <p><strong>Pembayaran sebelumnya ditolak.</strong> {openBill.invoice.rejectionReason}</p>
                </div>
              )}
              {openBill.state === "unpaid" ? (
                <PaymentReceiptDialog child={child} invoices={[openBill.invoice]} triggerLabel={openBill.invoice.rejectionReason ? "Unggah bukti pembayaran baru" : "Unggah bukti pembayaran"} />
              ) : (
                <PaymentVerificationStatus live={false} />
              )}
              <Link className="card-link" href={`/dashboard/payments/${openBill.invoice.slug}${childQuery}`}>Lihat detail tagihan <ArrowRight /></Link>
            </>
          ) : (
            <div className="bill-settled" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div><strong>Semua tagihan sudah lunas</strong><p>Tidak ada tagihan {child.firstName} yang menunggu pembayaran.</p></div>
            </div>
          )}
          <Link className="outline-button full-button dashboard-secondary-link" href={`/dashboard/payments${childQuery}`}>Buka riwayat pembayaran</Link>
        </article>

        <div className="activity-feed panel" aria-labelledby="dashboard-activity-title">
          <div className="section-title">
            <div><span>TERBARU</span><h2 id="dashboard-activity-title">Aktivitas {child.firstName}</h2></div>
            <Sparkles />
          </div>
          {activity ? (
            <Link className="activity-feature" href={`/dashboard/activities/${activity.slug}${childQuery}`}>
              <div className={`activity-art ${activity.tone}`}>
                {activityImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activityImage} alt={activity.title} />
                ) : (
                  <span>{activity.emoji}</span>
                )}
                <b>{activity.photos} foto</b>
              </div>
              <div className="activity-copy">
                <span className="activity-date"><CalendarDays /> {activity.date}{activity.time ? ` · ${activity.time}` : ""}</span>
                <h3>{activity.title}</h3>
                <p>{activity.summary}</p>
                <span className="teacher-note"><Sparkles /> Dibagikan oleh {activity.teacher}</span>
              </div>
              <ArrowRight className="activity-arrow" />
            </Link>
          ) : (
            <p className="fine-note">Belum ada aktivitas {child.firstName} yang dibagikan sekolah.</p>
          )}
          <Link className="primary-button full-button dashboard-secondary-link" href={`/dashboard/activities${childQuery}`}>Lihat aktivitas lainnya <ArrowRight /></Link>
        </div>
      </section>
    </div>
  );
}
