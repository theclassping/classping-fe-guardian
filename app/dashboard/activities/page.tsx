import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activities, child } from "@/lib/data";

export default function ActivitiesPage() {
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.firstName}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <ActivityList items={activities} />
    </div>
  );
}
