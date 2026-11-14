// What a stored album was built from. Same fingerprint → same PDFs; the school changing a photo, caption or remark changes it.
import { createHash } from "node:crypto";
import { periodParam } from "classping-album/period";
import type { AlbumSource } from "classping-album/types";

export function albumFingerprint(source: AlbumSource) {
  const activities = [...source.activities]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((activity) => ({
      id: activity.id,
      updatedAt: activity.updatedAt ?? null,
      date: activity.date,
      title: activity.title,
      description: activity.description ?? null,
      teacher: activity.teacher ?? null,
      remark: activity.remark ?? null,
      // Photo URLs are signed and change on every read; the photo's id and caption are what matter.
      photos: activity.photos.map((photo) => ({ id: photo.id, caption: photo.caption ?? null })),
    }));
  const payload = { v: 1, subject: `${source.subject.kind}:${source.subject.id}`, period: periodParam(source.period), school: source.school, activities };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
