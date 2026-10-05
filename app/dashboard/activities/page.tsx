import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesFor, getChild } from "@/lib/data";
import { activitiesForBackend, sessionStudentId, studentForBackend } from "@/lib/backend";

export default async function ActivitiesPage() {
  const fallback = getChild();
  const studentId = await sessionStudentId();
  const child = studentId ? await studentForBackend(studentId, fallback) : fallback;
  const activities = await activitiesForBackend(child.id, activitiesFor(child.id), studentId);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <ActivityList items={activities} child={child} />
    </div>
  );
}
