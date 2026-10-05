import Link from "next/link";
import { ArrowLeft, CalendarDays, LockKeyhole, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { activities, getChild } from "@/lib/data";
import { activityForBackend, sessionStudentId, studentForBackend } from "@/lib/backend";
import ActivityMediaSlider from "@/components/ActivityMediaSlider";

export function generateStaticParams() {
  return activities.map(({ slug }) => ({ slug }));
}

export default async function ActivityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallback = activities.find((item) => item.slug === slug) || activities[0];
  const studentId = await sessionStudentId();
  const activity = await activityForBackend(slug, fallback.childId, fallback, studentId);
  if (!activity) notFound();
  const childFallback = getChild();
  const child = studentId ? await studentForBackend(studentId, childFallback) : childFallback;

  return (
    <article className="detail-page">
      <Link className="back-link" href="/dashboard/activities"><ArrowLeft /> Kembali ke aktivitas</Link>
      <section className="detail-hero panel">
        <div className={`detail-art ${activity.tone}`}><ActivityMediaSlider images={activity.imageUrls} emoji={activity.emoji} title={activity.title} /></div>
        <div className="detail-hero-copy">
          <span className="activity-date"><CalendarDays /> {activity.date} · {activity.time}</span>
          <h1>{activity.title}</h1>
          <p>{activity.description}</p>
          <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        </div>
      </section>
      <section className="detail-grid">
        <div className="note-card panel"><span className="note-avatar">{activity.teacher.slice(3, 5)}</span><div><small>CATATAN {activity.teacher.toUpperCase()}</small><h2>Perkembangan yang terlihat</h2><p>{activity.teacherNote}</p></div><Sparkles /></div>
        <div className="privacy-card panel"><LockKeyhole /><div><h2>Privasi anak terjaga</h2><p>Dokumentasi ini hanya tampil karena {child.nickname || child.firstName} ditandai oleh pihak sekolah. Wali murid lain tidak dapat melihatnya.</p></div></div>
      </section>
    </article>
  );
}
