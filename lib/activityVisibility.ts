/** Defense in depth for the selected child; the backend also scopes every response. */
export type StudentPhoto = { image_url?: string; student_id?: number | string | null; student_ids?: (number | string)[]; tag_state?: "unreviewed" | "individual" | "group" | "legacy" };
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
export function studentRemark(remarks: { student_id: number | string; remark: string }[] = [], studentId?: number) {
  return studentId ? remarks.find(entry => Number(entry.student_id) === studentId)?.remark.trim() : undefined;
}
