// Yearly album builds. GET reports the stored album for a period (and whether it is stale); POST starts or resumes a build.
import { NextRequest, NextResponse, after } from "next/server";
import { academicYearOptionsFor, albumSourceFor } from "@/features/album/api";
import { findArtifact, isStale, registerArtifact, type Artifact } from "@/features/album/artifacts";
import { albumFingerprint } from "@/features/album/fingerprint";
import { buildArtifact } from "@/features/album/worker";
import { buildAlbum, downloadPartsFor } from "classping-album/model";
import { parsePeriodParam, periodParam } from "classping-album/period";
import type { AlbumSource } from "classping-album/types";
import { schoolForBackend, selectedStudentForRequest } from "@/features/family/api";
import { errorResponse } from "@/lib/http";
import { sessionAccessToken } from "@/lib/server-api";

export const dynamic = "force-dynamic";
// The build continues after the response (after()); a year of photos can take a few minutes.
export const maxDuration = 300;

export type JobView = {
  status: "none" | Artifact["status"];
  id?: number;
  /** The stored album was built from different photos or remarks than the school shares now. */
  stale?: boolean;
  photoCount: number;
  parts: { index: number; label: string; status: string; bytes: number | null; pages: number | null; photos: number }[];
  error?: string;
  updatedAt?: string;
};

function view(artifact: Artifact | null, extra: Partial<JobView> = {}): JobView {
  if (!artifact) return { status: "none", photoCount: 0, parts: [], ...extra };
  return {
    status: artifact.status,
    id: artifact.id,
    photoCount: artifact.photo_count,
    parts: artifact.parts.map((part) => ({ index: part.index, label: part.label, status: part.status, bytes: part.bytes, pages: part.pages, photos: part.photos })),
    error: artifact.error || undefined,
    updatedAt: artifact.updated_at,
    ...extra,
  };
}

async function requestContext(request: NextRequest, periodValue: string | null) {
  const { child, numericStudentId } = await selectedStudentForRequest();
  if (!numericStudentId) return { error: errorResponse("Pilih anak terlebih dahulu.", 400) };
  const school = await schoolForBackend(numericStudentId);
  const years = await academicYearOptionsFor(school?.branch_id);
  const period = parsePeriodParam(periodValue || undefined, years);
  if (!period || period.kind !== "year") return { error: errorResponse("Album yang disimpan hanya untuk tahun ajaran.", 400) };
  return { child, school, numericStudentId, period, periodKey: periodParam(period) };
}

/** What the school shares now: the source, its fingerprint and how it would split into PDFs. */
async function plan(context: Exclude<Awaited<ReturnType<typeof requestContext>>, { error: NextResponse }>) {
  const source: AlbumSource = await albumSourceFor(context.numericStudentId, context.period, context.child, context.school);
  const album = buildAlbum(source);
  const parts = downloadPartsFor(album).map((part) => ({ label: part.label, period: periodParam(part.period), photos: part.photos }));
  return { source, fingerprint: albumFingerprint(source), photoCount: album.photoUrls.length, parts };
}

function startBuild(artifact: Artifact, source: AlbumSource, accessToken: string) {
  after(() => buildArtifact(artifact, source, accessToken));
}

export async function GET(request: NextRequest) {
  const context = await requestContext(request, request.nextUrl.searchParams.get("period"));
  if ("error" in context) return context.error;
  const artifact = await findArtifact(context.numericStudentId, context.periodKey);
  const check = request.nextUrl.searchParams.get("check") === "1";
  if (!check && artifact && !isStale(artifact)) return NextResponse.json(view(artifact), { headers: { "Cache-Control": "no-store" } });
  if (!check && !artifact) return NextResponse.json(view(null), { headers: { "Cache-Control": "no-store" } });
  // First load, or a build whose worker went quiet: compare with what the school shares now.
  const current = await plan(context);
  if (artifact && isStale(artifact) && artifact.fingerprint === current.fingerprint) {
    const accessToken = await sessionAccessToken();
    if (accessToken) startBuild(artifact, current.source, accessToken);
  }
  return NextResponse.json(view(artifact, { stale: artifact ? artifact.fingerprint !== current.fingerprint : undefined, photoCount: artifact?.photo_count ?? current.photoCount }), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { period?: string };
  const context = await requestContext(request, body.period ?? null);
  if ("error" in context) return context.error;
  const current = await plan(context);
  if (!current.photoCount) return errorResponse("Belum ada foto untuk tahun ajaran ini.", 409);
  const accessToken = await sessionAccessToken();
  if (!accessToken) return errorResponse("Sesi telah berakhir.", 401);
  const registered = await registerArtifact({ studentId: context.numericStudentId, period: context.periodKey, fingerprint: current.fingerprint, photoCount: current.photoCount, parts: current.parts });
  if (!registered.artifact) return errorResponse(registered.error || "Tidak dapat memulai pembuatan album.", registered.status || 502);
  const artifact = registered.artifact;
  if (registered.created || isStale(artifact)) startBuild(artifact, current.source, accessToken);
  return NextResponse.json(view(artifact, { stale: false }), { status: registered.created ? 202 : 200, headers: { "Cache-Control": "no-store" } });
}
