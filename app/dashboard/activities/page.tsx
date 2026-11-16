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
      {/* Phones show the nickname and skip the description; the album button becomes a bottom bar there. */}
      <PageHeader className="activities-header" eyebrow="DOKUMENTASI SEKOLAH" description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda."
        title={<>Aktivitas <span className="name-full">{child.name}</span><span className="name-short">{child.nickname || child.firstName}</span></>}
        action={<Suspense><AlbumButton items={activities} subject={child.nickname || child.firstName} /></Suspense>} />
      <Suspense fallback={<p className="fine-note">Memuat aktivitas...</p>}>
        <ActivityList items={activities} child={child} />
      </Suspense>
    </div>
  );
}
