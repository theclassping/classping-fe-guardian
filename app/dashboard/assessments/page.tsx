import { selectedStudentForRequest } from "@/features/family/api";
import AssessmentList from "@/features/assessments/components/AssessmentList";
import PageHeader from "@/components/PageHeader";
import { placeholderAssessments } from "@/features/assessments/placeholder";

export default async function AssessmentsPage() {
  const { child, studentId } = await selectedStudentForRequest();
  return (
    <div className="content-page">
      <PageHeader eyebrow="PERKEMBANGAN ANAK" title={`Penilaian ${child.firstName}`} description={`Pantau capaian perkembangan ${child.firstName} berdasarkan observasi guru di sekolah.`} />
      <section className="assessment-overview panel"><div><span>5</span><p>Area perkembangan</p></div><div><span>2</span><p>Laporan tersedia</p></div><div><span>BSH</span><p>Capaian dominan</p></div></section>
      <AssessmentList items={placeholderAssessments} studentId={studentId} />
    </div>
  );
}
