import { selectedStudentForRequest } from "@/lib/backend";
import AssessmentList from "@/components/AssessmentList";
import PageHeader from "@/components/PageHeader";
import { assessmentsFor } from "@/lib/data";

export default async function AssessmentsPage() {
  const { child, studentId } = await selectedStudentForRequest();
  const assessments = assessmentsFor(child.id);
  return (
    <div className="content-page">
      <PageHeader eyebrow="PERKEMBANGAN ANAK" title={`Penilaian ${child.firstName}`} description={`Pantau capaian perkembangan ${child.firstName} berdasarkan observasi guru di sekolah.`} />
      <section className="assessment-overview panel"><div><span>5</span><p>Area perkembangan</p></div><div><span>2</span><p>Laporan tersedia</p></div><div><span>BSH</span><p>Capaian dominan</p></div></section>
      <AssessmentList items={assessments} childId={child.id} studentId={studentId} />
    </div>
  );
}
