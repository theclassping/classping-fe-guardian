// Which photos go on which page. Pure, so the preview and the PDF paginate identically and tests need no rendering.
import { pick, unit } from "./seed";
import { TONES, type Tone } from "./theme";
import { dateLabel } from "./period";
import type { ActivityEntry, AlbumActivity, AlbumPage, AlbumPhoto, PhotoLayout, PlacedPhoto } from "./types";

export const PHOTOS_PER_PAGE = 6;

/** Which polaroid arrangement fits this many photos (at most PHOTOS_PER_PAGE). */
export function layoutFor(count: number): PhotoLayout {
  if (count <= 0) return "none";
  if (count === 1) return "hero";
  if (count === 2) return "pair";
  if (count <= 4) return "grid4";
  return "grid6";
}

/** A photo's tilt (±4°) and tape colour, fixed by its id. */
export function placePhoto(photo: AlbumPhoto): PlacedPhoto {
  return { ...photo, tilt: Math.round((unit(photo.id, "tilt") * 8 - 4) * 10) / 10, tape: pick(TONES, photo.id, "tape") };
}

/** Each activity gets its own tone, so facing pages differ. */
export function toneFor(seed: string): Tone {
  return pick(TONES, seed, "tone");
}

/** Splits photos into pages of at most PHOTOS_PER_PAGE; only the first carries the text. */
export function entriesFor(activity: AlbumActivity): ActivityEntry[] {
  const tone = toneFor(activity.id);
  const chunks: AlbumPhoto[][] = [];
  for (let i = 0; i < activity.photos.length; i += PHOTOS_PER_PAGE) chunks.push(activity.photos.slice(i, i + PHOTOS_PER_PAGE));
  if (!chunks.length) chunks.push([]);
  return chunks.map((photos, index) => ({
    activityId: activity.id,
    title: activity.title,
    dateLabel: dateLabel(activity.date),
    teacher: activity.teacher,
    description: index === 0 ? activity.description : undefined,
    remark: index === 0 ? activity.remark : undefined,
    photos: photos.map(placePhoto),
    layout: layoutFor(photos.length),
    continuation: index > 0,
    tone,
  }));
}

/** A short entry (≤2 photos, no remark, little text) shares its page with the next short one. */
export function isShort(entry: ActivityEntry) {
  return entry.photos.length <= 2 && !entry.continuation && !entry.remark && (entry.description?.length ?? 0) <= 160;
}

/** Activity pages in the order given: one entry per page, except consecutive short entries, which pair up. */
export function activityPages(activities: AlbumActivity[]): AlbumPage[] {
  const entries = activities.flatMap(entriesFor);
  const pages: AlbumPage[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const next = entries[i + 1];
    if (next && isShort(entry) && isShort(next)) {
      pages.push({ kind: "activity", entries: [entry, next] });
      i++;
    } else {
      pages.push({ kind: "activity", entries: [entry] });
    }
  }
  return pages;
}
