import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesFor, getChild } from "@/lib/data";
import { activitiesForBackend, studentForBackend } from "@/lib/backend";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const fallback = getChild(query.child);
  const child = query.student_id ? await studentForBackend(Number(query.student_id), fallback) : fallback;
  const activities = await activitiesForBackend(child.id, activitiesFor(child.id), query.student_id ? Number(query.student_id) : undefined);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <ActivityList items={activities} child={child} studentId={query.student_id} />
    </div>
  );
}
