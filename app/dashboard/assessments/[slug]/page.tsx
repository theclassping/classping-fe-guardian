import { selectedStudentForRequest } from "@/lib/backend";
import Link from "next/link";
import { ArrowLeft, Award, MessageCircleHeart } from "lucide-react";
import { notFound } from "next/navigation";
import { assessments } from "@/lib/data";

export function generateStaticParams() {
  return assessments.map(({ slug }) => ({ slug }));
}

export default async function AssessmentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const assessment = assessments.find((item) => item.slug === slug);
  if (!assessment) notFound();
  const { child, studentId } = await selectedStudentForRequest();
  return (
    <article className="detail-page assessment-detail">
      <Link className="back-link" href={`/dashboard/assessments?${studentId ? `student_id=${encodeURIComponent(studentId)}` : `child=${child.id}`}`}><ArrowLeft /> Kembali ke penilaian</Link>
      <header className="report-header panel"><span className="report-icon"><Award /></span><div><p className="eyebrow">{assessment.status}</p><h1>{assessment.title}</h1><p>{child.name} · {assessment.period}</p></div></header>
      <section className="score-panel panel">
        <div className="section-title"><div><span>RINGKASAN CAPAIAN</span><h2>Area perkembangan</h2></div></div>
        <div className="score-list">{assessment.scores.map((score) => <div className="score-row" key={score.label}><div><strong>{score.label}</strong><span>{score.level}</span></div><div className="progress"><i style={{ width: `${score.value}%` }} /></div><b>{score.value}%</b></div>)}</div>
        <div className="legend"><span><b>BB</b> Belum berkembang</span><span><b>MB</b> Mulai berkembang</span><span><b>BSH</b> Sesuai harapan</span><span><b>BSB</b> Sangat baik</span></div>
      </section>
      <section className="teacher-message panel"><MessageCircleHeart /><div><small>CATATAN {assessment.teacher.toUpperCase()}</small><h2>Saran untuk pendampingan di rumah</h2><p>{assessment.note}</p></div></section>
    </article>
  );
}
