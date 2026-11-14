// The backend's record of a stored album: its parts, their files and how far the build got.
import { getWithStatus, sendWithStatus } from "@/lib/server-api";

export type ArtifactStatus = "pending" | "building" | "ready" | "failed";
export type ArtifactPartStatus = "pending" | "building" | "ready" | "failed";

export type ArtifactPart = {
  index: number;
  label: string;
  /** URL form of the part's period, e.g. "range:2026-07-01:2026-12-31". */
  period: string;
  photos: number;
  status: ArtifactPartStatus;
  file_key: string | null;
  bytes: number | null;
  pages: number | null;
  error: string;
};

export type Artifact = {
  id: number;
  student_id: number;
  period: string;
  fingerprint: string;
  status: ArtifactStatus;
  photo_count: number;
  parts: ArtifactPart[];
  heartbeat_at: string | null;
  error: string;
  created_at: string;
  updated_at: string;
};

export type ArtifactPlanPart = { label: string; period: string; photos: number };

const base = "/api/albums/artifacts";

/** The stored album for this student and period, or null when none was ever built. */
export async function findArtifact(studentId: number, period: string) {
  const query = new URLSearchParams({ student_id: String(studentId), period });
  return (await getWithStatus<Artifact>(`${base}/?${query.toString()}`)).data;
}

export async function readArtifact(id: number, accessToken?: string) {
  return (await sendWithStatus<Artifact>(`${base}/${id}/`, { method: "PATCH", body: {}, accessToken })).data;
}

/** Registers a build. The backend answers 200 with the live build when one exists for the same fingerprint, 201 when it started a new one. */
export async function registerArtifact(input: { studentId: number; period: string; fingerprint: string; photoCount: number; parts: ArtifactPlanPart[] }) {
  const result = await sendWithStatus<Artifact>(`${base}/`, {
    body: { student_id: input.studentId, period: input.period, fingerprint: input.fingerprint, photo_count: input.photoCount, parts: input.parts },
  });
  return { artifact: result.data, created: result.status === 201, status: result.status, error: result.error };
}

export type ArtifactPatch = { heartbeat?: boolean; status?: ArtifactStatus; error?: string; part?: { index: number; status?: ArtifactPartStatus; bytes?: number; pages?: number; error?: string } };

export async function patchArtifact(id: number, patch: ArtifactPatch, accessToken: string) {
  return await sendWithStatus<Artifact>(`${base}/${id}/`, { method: "PATCH", body: patch, accessToken });
}

export async function partUploadUrl(id: number, index: number, accessToken: string) {
  return (await sendWithStatus<{ upload_url: string; file_key: string; expires_in: number }>(`${base}/${id}/parts/${index}/upload-url/`, { body: {}, accessToken })).data;
}

export async function partDownloadUrl(id: number, index: number) {
  return await getWithStatus<{ url: string; expires_in: number; bytes: number | null; label: string }>(`${base}/${id}/parts/${index}/download-url/`);
}

/** A build is considered abandoned when its worker has not reported for this long (serverless functions can be cut off). */
export const STALE_AFTER_MS = 2.5 * 60 * 1000;

export function isStale(artifact: Artifact) {
  if (artifact.status !== "pending" && artifact.status !== "building") return false;
  const last = Date.parse(artifact.heartbeat_at || artifact.updated_at);
  return !Number.isFinite(last) || Date.now() - last > STALE_AFTER_MS;
}
