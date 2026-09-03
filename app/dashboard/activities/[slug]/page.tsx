import Link from "next/link";
import { ArrowLeft, CalendarDays, Camera, LockKeyhole, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { activities, getChild } from "@/lib/data";

export function generateStaticParams() {
  return activities.map(({ slug }) => ({ slug }));
}

export default async function ActivityDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ child?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const activity = activities.find((item) => item.slug === slug);
  if (!activity) notFound();
  const child = getChild(activity.childId || query.child);

  return (
    <article className="detail-page">
      <Link className="back-link" href={`/dashboard/activities?child=${child.id}`}><ArrowLeft /> Kembali ke aktivitas</Link>
      <section className="detail-hero panel">
        <div className={`detail-art ${activity.tone}`}><span>{activity.emoji}</span><b><Camera /> {activity.photos} foto untuk {child.firstName}</b></div>
        <div className="detail-hero-copy">
          <span className="activity-date"><CalendarDays /> {activity.date} · {activity.time}</span>
          <h1>{activity.title}</h1>
          <p>{activity.description}</p>
          <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        </div>
      </section>
      <section className="detail-grid">
        <div className="note-card panel"><span className="note-avatar">{activity.teacher.slice(3, 5)}</span><div><small>CATATAN {activity.teacher.toUpperCase()}</small><h2>Perkembangan yang terlihat</h2><p>{activity.teacherNote}</p></div><Sparkles /></div>
        <div className="privacy-card panel"><LockKeyhole /><div><h2>Privasi anak terjaga</h2><p>Dokumentasi ini hanya tampil karena {child.firstName} ditandai oleh pihak sekolah. Wali murid lain tidak dapat melihatnya.</p></div></div>
      </section>
    </article>
  );
}
