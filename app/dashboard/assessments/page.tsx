import AssessmentList from "@/components/AssessmentList";
import PageHeader from "@/components/PageHeader";
import { assessments, child } from "@/lib/data";

export default function AssessmentsPage() {
  return (
    <div className="content-page">
      <PageHeader eyebrow="PERKEMBANGAN ANAK" title={`Penilaian ${child.firstName}`} description="Pantau capaian perkembangan Alya berdasarkan observasi guru di sekolah." />
      <section className="assessment-overview panel"><div><span>5</span><p>Area perkembangan</p></div><div><span>2</span><p>Laporan tersedia</p></div><div><span>BSH</span><p>Capaian dominan</p></div></section>
      <AssessmentList items={assessments} />
    </div>
  );
}
