import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesFor } from "@/lib/data";
import { activitiesForBackend, selectedStudentForRequest } from "@/lib/backend";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const { child, studentId } = await selectedStudentForRequest(query);
  const activities = await activitiesForBackend(child.id, activitiesFor(child.id), studentId ? Number(studentId) : undefined);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <ActivityList items={activities} child={child} studentId={studentId} />
    </div>
  );
}
