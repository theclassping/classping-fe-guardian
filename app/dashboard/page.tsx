import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { activitiesFor, assessmentsFor, invoicesFor } from "@/lib/data";
import { activitiesForBackend, invoicesForBackend, selectedStudentForRequest } from "@/lib/backend";

function currentDate() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

export default async function GuardianDashboard() {
  const { child, studentId } = await selectedStudentForRequest();
  const activities = await activitiesForBackend(child.id, activitiesFor(child.id), studentId ? Number(studentId) : undefined);
  const assessments = assessmentsFor(child.id);
  const invoices = await invoicesForBackend(child.id, invoicesFor(child.id));
  const nextInvoice = invoices[0];
  const childQuery = studentId ? `?student_id=${studentId}` : `?child=${child.id}`;
  const isJisindo = child.id === "jisindo";

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={currentDate()}
        title="Selamat datang, Bu Rina! 👋"
        description={`Ikuti kegiatan, perkembangan, dan administrasi ${child.firstName} dalam satu tempat.`}
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

      <section className="fee-alert" aria-label="Pengingat tagihan">
        <BellRing aria-hidden="true" />
        <div>
          <strong>SPP {nextInvoice.month} segera jatuh tempo</strong>
          <p>{nextInvoice.amount} · Bayar sebelum {nextInvoice.dueDate} agar tidak terkena denda.</p>
        </div>
        <Link href={`/dashboard/payments/${nextInvoice.slug}${childQuery}`}>Lihat tagihan</Link>
      </section>

      <section className="summary-grid" aria-label={`Ringkasan ${child.firstName}`}>
        <article className="summary-card panel">
          <span className="summary-icon green"><Camera /></span>
          <div><small>Dokumentasi terbaru</small><strong>{activities[0].photos} foto</strong><p>Hari ini</p></div>
        </article>
        <article className="summary-card panel">
          <span className="summary-icon blue"><BookOpenCheck /></span>
          <div><small>Perkembangan</small><strong>{isJisindo ? "Mulai berkembang" : "Baik"}</strong><p>Semester berjalan</p></div>
        </article>
        <article className="summary-card panel">
          <span className="summary-icon orange"><ReceiptText /></span>
          <div><small>Status SPP</small><strong className="paid-text">{isJisindo ? "2 tagihan" : "1 tagihan"}</strong><p>{isJisindo ? "Termasuk sisa Agustus" : "Perlu dibayar"}</p></div>
        </article>
      </section>

      <section className="dashboard-content">
        <div className="activity-feed panel">
          <div className="section-title">
            <div><span>HARI INI</span><h2>Aktivitas {child.firstName}</h2></div>
            <Link href={`/dashboard/activities${childQuery}`}>Lihat semua <ArrowRight /></Link>
          </div>
          {activities.slice(0, 2).map((activity) => (
            <Link className="activity-feature" href={`/dashboard/activities/${activity.slug}${childQuery}`} key={activity.slug}>
              <div className={`activity-art ${activity.tone}`}><span>{activity.emoji}</span><b>{activity.photos} foto</b></div>
              <div className="activity-copy">
                <span className="activity-date"><CalendarDays /> {activity.date} · {activity.time}</span>
                <h3>{activity.title}</h3>
                <p>{activity.summary}</p>
                <span className="teacher-note"><Sparkles /> Catatan {activity.teacher}: {activity.teacherNote}</span>
              </div>
              <ArrowRight className="activity-arrow" />
            </Link>
          ))}
        </div>

        <aside className="dashboard-side">
          <article className="assessment-card panel">
            <div className="section-title"><div><span>PENILAIAN</span><h2>Perkembangan {child.firstName}</h2></div><span className="ready-chip">Siap dilihat</span></div>
            <p>{assessments[0].summary}</p>
            {assessments[0].scores.slice(0, 3).map((score) => (
              <div className="skill-row" key={score.label}>
                <div><span>{score.label}</span><b>{score.level}</b></div>
                <div className="progress"><i style={{ width: `${score.value}%` }} /></div>
              </div>
            ))}
            <Link className="card-link" href={`/dashboard/assessments/${assessments[0].slug}${childQuery}`}>Lihat laporan lengkap <ArrowRight /></Link>
          </article>

          <article className="fee-card panel">
            <div className="section-title"><div><span>SPP & TAGIHAN</span><h2>Pembayaran</h2></div><CheckCircle2 /></div>
            <div className="next-bill"><span>Tagihan berikutnya</span><strong>{nextInvoice.amount}</strong><small><Clock3 /> Jatuh tempo {nextInvoice.dueDate}</small></div>
            <p className="fine-note">Denda keterlambatan: {nextInvoice.fine}</p>
            <Link className="primary-button full-button" href={`/dashboard/payments${childQuery}`}>Buka riwayat pembayaran</Link>
          </article>
        </aside>
      </section>
    </div>
  );
}
