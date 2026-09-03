import ActivityList from "@/components/ActivityList";
import PageHeader from "@/components/PageHeader";
import { activitiesFor, getChild } from "@/lib/data";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const query = await searchParams;
  const child = getChild(query.child);
  return (
    <div className="content-page">
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Aktivitas ${child.firstName}`} description="Foto dan cerita kegiatan yang dibagikan guru khusus untuk anak Anda." />
      <ActivityList items={activitiesFor(child.id)} child={child} />
    </div>
  );
}
