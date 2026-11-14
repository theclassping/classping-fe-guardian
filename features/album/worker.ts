// Builds the PDFs of a stored album one part at a time and uploads each to the backend's storage.
// Runs after the response that started it (Next's `after()`), so it carries the session token explicitly.
import { fetchAlbumImages, type AlbumImages } from "classping-album/images";
import { buildAlbum } from "classping-album/model";
import { renderAlbumPdf } from "classping-album/pdf/render";
import { parsePeriodParam, periodRange } from "classping-album/period";
import type { AlbumSource } from "classping-album/types";
import { partUploadUrl, patchArtifact, readArtifact, type Artifact } from "@/features/album/artifacts";

const HEARTBEAT_MS = 30_000;

/** The source cut down to one part's period. */
export function sourceForPart(source: AlbumSource, periodValue: string): AlbumSource | null {
  const period = parsePeriodParam(periodValue);
  if (!period) return null;
  const { from, to } = periodRange(period);
  return { ...source, period, activities: source.activities.filter((activity) => activity.date >= from && activity.date <= to) };
}

async function uploadPdf(url: string, pdf: Buffer) {
  const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: new Uint8Array(pdf) });
  if (!response.ok) throw new Error(`Unggahan PDF ditolak (${response.status}).`);
}

/**
 * Renders every part that is not ready yet. Photos are fetched and shrunk once and shared across parts.
 * Progress goes to the backend after each step, so a poll sees it and an abandoned build can be detected.
 */
export async function buildArtifact(artifact: Artifact, source: AlbumSource, accessToken: string) {
  const cache: AlbumImages = new Map();
  const beat = setInterval(() => void patchArtifact(artifact.id, { heartbeat: true }, accessToken), HEARTBEAT_MS);
  try {
    // Another worker may have finished some parts meanwhile; build only what is still missing.
    const current = (await readArtifact(artifact.id, accessToken)) ?? artifact;
    if (current.fingerprint !== artifact.fingerprint) return;
    await patchArtifact(artifact.id, { heartbeat: true, status: "building" }, accessToken);
    for (const part of current.parts) {
      if (part.status === "ready") continue;
      const partSource = sourceForPart(source, part.period);
      if (!partSource) {
        await patchArtifact(artifact.id, { part: { index: part.index, status: "failed", error: "Periode bagian tidak dikenali." } }, accessToken);
        continue;
      }
      try {
        const album = buildAlbum(partSource);
        const images = await fetchAlbumImages(album.photoUrls, { cache, timeoutMs: 90_000 });
        await patchArtifact(artifact.id, { heartbeat: true }, accessToken);
        const pdf = await renderAlbumPdf(album, images, { producer: "ClassPing Guardian Portal" });
        const upload = await partUploadUrl(artifact.id, part.index, accessToken);
        if (!upload) throw new Error("Tidak dapat menyiapkan unggahan.");
        await uploadPdf(upload.upload_url, pdf);
        await patchArtifact(artifact.id, { heartbeat: true, part: { index: part.index, status: "ready", bytes: pdf.byteLength, pages: album.pages.length, error: "" } }, accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membuat PDF.";
        await patchArtifact(artifact.id, { part: { index: part.index, status: "failed", error: message }, status: "failed", error: message }, accessToken);
        return;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat album.";
    await patchArtifact(artifact.id, { status: "failed", error: message }, accessToken).catch(() => undefined);
  } finally {
    clearInterval(beat);
  }
}
