import { NextRequest, NextResponse } from "next/server";
import { academicYearOptionsFor, albumSourceFor } from "@/features/album/api";
import { fetchAlbumImages } from "classping-album/images";
import { MAX_PHOTOS_PER_PDF, buildAlbum } from "classping-album/model";
import { renderAlbumPdf } from "classping-album/pdf/render";
import { currentMonth, parsePeriodParam } from "classping-album/period";
import { schoolForBackend, selectedStudentForRequest } from "@/features/family/api";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
// Fetching and shrinking a month of photos takes a few seconds; a whole year can take longer.
export const maxDuration = 60;


export async function GET(request: NextRequest) {
  const { child, numericStudentId } = await selectedStudentForRequest();
  if (!numericStudentId) return errorResponse("Pilih anak terlebih dahulu.", 400);
  const school = await schoolForBackend(numericStudentId);
  const years = await academicYearOptionsFor(school?.branch_id);
  const period = parsePeriodParam(request.nextUrl.searchParams.get("period") || undefined, years) ?? currentMonth();
  const album = buildAlbum(await albumSourceFor(numericStudentId, period, child, school));
  if (album.photoUrls.length > MAX_PHOTOS_PER_PDF) return errorResponse(`Album ini memuat ${album.photoUrls.length} foto; unduh per bagian dari halaman album (maksimal ${MAX_PHOTOS_PER_PDF} foto per PDF).`, 413);
  const images = await fetchAlbumImages(album.photoUrls);
  const pdf = await renderAlbumPdf(album, images, { producer: "ClassPing Guardian Portal" });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${album.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
