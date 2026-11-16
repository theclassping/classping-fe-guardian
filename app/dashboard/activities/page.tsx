import { Suspense } from "react";
import ActivityList from "@/features/activities/components/ActivityList";
import AlbumButton from "@/features/album/components/AlbumButton";
import PageHeader from "@/components/PageHeader";
import { activitiesForBackend } from "@/features/activities/api";
import { selectedStudentForRequest } from "@/features/family/api";

export default async function ActivitiesPage() {
  const { child, numericStudentId } = await selectedStudentForRequest();
  const activities = await activitiesForBackend(numericStudentId);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda."
        action={<Suspense><AlbumButton items={activities} subject={child.nickname || child.firstName} /></Suspense>} />
      <Suspense fallback={<p className="fine-note">Memuat aktivitas...</p>}>
        <ActivityList items={activities} child={child} />
      </Suspense>
    </div>
  );
}
