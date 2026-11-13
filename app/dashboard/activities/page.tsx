import { Suspense } from "react";
import Link from "next/link";
import { BookHeart } from "lucide-react";
import ActivityList from "@/features/activities/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesForBackend } from "@/features/activities/api";
import { selectedStudentForRequest } from "@/features/family/api";

export default async function ActivitiesPage() {
  const { child, numericStudentId } = await selectedStudentForRequest();
  const activities = await activitiesForBackend(numericStudentId);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.name}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda."
        action={<Link className="outline-button" href="/dashboard/activities/album" style={{ whiteSpace: "nowrap" }}><BookHeart /> Album Digital</Link>} />
      <Suspense fallback={<p className="fine-note">Memuat aktivitas...</p>}>
        <ActivityList items={activities} child={child} />
      </Suspense>
    </div>
  );
}
