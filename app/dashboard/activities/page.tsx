import { Suspense } from "react";
import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesForBackend, selectedStudentForRequest } from "@/lib/backend";

export default async function ActivitiesPage() {
  const { child, numericStudentId } = await selectedStudentForRequest();
  const activities = await activitiesForBackend(child.id, numericStudentId);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <Suspense fallback={<p className="fine-note">Memuat aktivitas...</p>}>
        <ActivityList items={activities} child={child} />
      </Suspense>
    </div>
  );
}
