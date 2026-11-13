import "classping-album/album.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AlbumPreview from "classping-album/components/AlbumPreview";
import AlbumToolbar from "@/features/album/components/AlbumToolbar";
import { academicYearOptionsFor, albumMonthsFor, albumSourceFor } from "@/features/album/api";
import { buildAlbum, downloadPeriodsFor } from "classping-album/model";
import { currentMonth, parsePeriodParam, periodLabel, periodParam } from "classping-album/period";
import { schoolForBackend, selectedStudentForRequest } from "@/features/family/api";

export const metadata = { title: "Album Digital" };

export default async function AlbumPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: requested } = await searchParams;
  const { child, numericStudentId } = await selectedStudentForRequest();
  if (!numericStudentId) {
    return (
      <div className="content-page">
        <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title="Album Digital" description="Pilih anak terlebih dahulu untuk melihat albumnya." />
      </div>
    );
  }
  const school = await schoolForBackend(numericStudentId);
  const [months, years] = await Promise.all([albumMonthsFor(numericStudentId), academicYearOptionsFor(school?.branch_id)]);
  const period = parsePeriodParam(requested, years) ?? (months[0] ? { kind: "month" as const, ...months[0] } : currentMonth());
  const album = buildAlbum(await albumSourceFor(numericStudentId, period, child, school));
  // A year with more photos than one PDF can hold downloads as consecutive parts.
  const downloadParts = downloadPeriodsFor(album).map((part) => ({ value: periodParam(part), label: periodLabel(part) }));
  return (
    <div className="content-page">
      <Link className="back-link" href="/dashboard/activities"><ArrowLeft /> Kembali ke aktivitas</Link>
      <PageHeader eyebrow="DOKUMENTASI SEKOLAH" title={`Album ${child.nickname || child.firstName}`} description="Rangkuman kegiatan dan foto dalam satu album digital yang bisa diunduh sebagai PDF." />
      <AlbumToolbar period={period} months={months} years={years} pageCount={album.pages.length} photoCount={album.photoUrls.length} downloadParts={downloadParts} />
      <AlbumPreview document={album} />
    </div>
  );
}
