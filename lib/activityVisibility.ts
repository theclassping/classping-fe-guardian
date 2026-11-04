/** Defense in depth for the selected child; the backend also scopes every response. */
export type StudentPhoto = { image_url?: string; caption?: string | null; position?: number; student_id?: number | string | null; student_ids?: (number | string)[]; tag_state?: "unreviewed" | "individual" | "group" | "legacy" };
export function photoStudentIds(photo: StudentPhoto) {
  return (photo.student_ids ?? (photo.student_id == null ? [] : [photo.student_id])).map(Number).filter(id => Number.isInteger(id) && id > 0);
}
/**
 * A guardian sees the child's own tagged photos plus every shared photo: group shots
 * and untagged photos, whatever their tag_state (backends without tagging send none).
 * Only photos the teacher has not reviewed yet stay hidden.
 */
export function photosForStudent<T extends StudentPhoto>(photos: T[] = [], studentId?: number): T[] {
  if (!studentId) return photos;
  return photos.filter(photo => {
    if (photo.tag_state === "unreviewed") return false;
    const tagged = photoStudentIds(photo);
    return tagged.length === 0 || tagged.includes(studentId);
  });
}
/**
 * The teacher's note for a child is the captions on photos tagged to that child.
 * Shared group/untagged photos are skipped so a note never describes another child.
 */
export function studentCaption(photos: StudentPhoto[] = [], studentId?: number) {
  if (!studentId) return undefined;
  const captions = photos
    .filter(photo => photo.tag_state !== "unreviewed" && photoStudentIds(photo).includes(studentId))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(photo => photo.caption?.trim())
    .filter((caption): caption is string => Boolean(caption));
  return captions.length ? [...new Set(captions)].join(" ") : undefined;
}
