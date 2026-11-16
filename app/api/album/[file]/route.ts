import { NextRequest, NextResponse } from "next/server";
import { albumSourceFor } from "@/features/album/api";
import { fetchAlbumImages } from "@/features/album/core/images";
import { MAX_PHOTOS_PER_PDF, buildAlbum } from "@/features/album/core/model";
import { renderAlbumPdf } from "@/features/album/core/pdf/render";
import { currentMonth, parsePeriodParam } from "@/features/album/core/period";
import { schoolForBackend, selectedStudentForRequest } from "@/features/family/api";

export const dynamic = "force-dynamic";
// Fetching and shrinking the photos takes a few seconds; a semester of up to MAX_PHOTOS_PER_PDF fits comfortably.
export const maxDuration = 60;

/** The PDF opens in a new tab, so an error has to be a page the reader can see, not JSON. */
function errorPage(message: string, status: number) {
  const escaped = message.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Album Digital</title></head><body style="font-family:sans-serif;padding:32px"><p>${escaped}</p></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/** The last path segment is the file name (…/album-aisyah-2026-11-04.pdf), which browsers and Safari's viewer use. */
export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!file.endsWith(".pdf")) return errorPage("Berkas album tidak dikenal.", 404);
  const { child, numericStudentId } = await selectedStudentForRequest();
  if (!numericStudentId) return errorPage("Pilih anak terlebih dahulu.", 400);
  const school = await schoolForBackend(numericStudentId);
  const period = parsePeriodParam(request.nextUrl.searchParams.get("period") || undefined) ?? currentMonth();
  const album = buildAlbum(await albumSourceFor(numericStudentId, period, child, school));
  if (album.photoUrls.length === 0) return errorPage("Belum ada foto pada periode ini.", 404);
  if (album.photoUrls.length > MAX_PHOTOS_PER_PDF) return errorPage(`Album ini memuat ${album.photoUrls.length} foto; buka per bagian dari tombol Album Digital (maksimal ${MAX_PHOTOS_PER_PDF} foto per PDF).`, 413);
  let pdf: Buffer;
  try {
    const images = await fetchAlbumImages(album.photoUrls);
    pdf = await renderAlbumPdf(album, images, { producer: "ClassPing Guardian Portal" });
  } catch (error) {
    // Vercel keeps the stack in its function logs; the tab gets the message so the failure is not a blank page.
    console.error("[album] generation failed", error);
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return errorPage(`Album gagal dibuat. Coba lagi beberapa saat. (${detail})`, 500);
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${album.fileName}"`,
      // Safari's PDF viewer shows a blank page for a response it may not keep, so the PDF is cacheable for this user only.
      "Cache-Control": "private, max-age=0",
    },
  });
}
