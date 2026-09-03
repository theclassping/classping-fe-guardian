import AssessmentList from "@/components/AssessmentList";
import PageHeader from "@/components/PageHeader";
import { assessmentsFor, getChild } from "@/lib/data";

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const query = await searchParams;
  const child = getChild(query.child);
  const assessments = assessmentsFor(child.id);
  return (
    <div className="content-page">
      <PageHeader eyebrow="PERKEMBANGAN ANAK" title={`Penilaian ${child.firstName}`} description={`Pantau capaian perkembangan ${child.firstName} berdasarkan observasi guru di sekolah.`} />
      <section className="assessment-overview panel"><div><span>5</span><p>Area perkembangan</p></div><div><span>2</span><p>Laporan tersedia</p></div><div><span>BSH</span><p>Capaian dominan</p></div></section>
      <AssessmentList items={assessments} childId={child.id} />
    </div>
  );
}
