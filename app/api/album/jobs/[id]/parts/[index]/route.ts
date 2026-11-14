// Streams one finished part of a stored album to the browser with a proper file name.
import { NextRequest, NextResponse } from "next/server";
import { partDownloadUrl, readArtifact } from "@/features/album/artifacts";
import { selectedStudentForRequest } from "@/features/family/api";
import { errorResponse } from "@/lib/http";
import { sessionAccessToken } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "album";
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await context.params;
  const artifactId = Number(id);
  const partIndex = Number(index);
  if (!Number.isInteger(artifactId) || !Number.isInteger(partIndex)) return errorResponse("Bagian tidak ditemukan.", 404);
  const { child, numericStudentId } = await selectedStudentForRequest();
  if (!numericStudentId) return errorResponse("Pilih anak terlebih dahulu.", 400);
  const accessToken = await sessionAccessToken();
  const artifact = accessToken ? await readArtifact(artifactId, accessToken) : null;
  if (!artifact || artifact.student_id !== numericStudentId) return errorResponse("Album tidak ditemukan.", 404);
  const link = await partDownloadUrl(artifactId, partIndex);
  if (!link.data) return errorResponse(link.error || "Bagian ini belum siap.", link.status || 502);
  const file = await fetch(link.data.url, { cache: "no-store" });
  if (!file.ok || !file.body) return errorResponse("Berkas album tidak dapat dibaca.", 502);
  const suffix = artifact.parts.length > 1 ? `-bagian-${partIndex + 1}` : "";
  const fileName = `album-${slug(child.nickname || child.firstName)}-${artifact.period.replace(/:/g, "-")}${suffix}.pdf`;
  return new NextResponse(file.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      ...(file.headers.get("content-length") ? { "Content-Length": file.headers.get("content-length") as string } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
