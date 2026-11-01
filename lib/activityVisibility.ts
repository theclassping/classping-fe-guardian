/** Defense in depth for the selected child; the backend also scopes every response. */
export type StudentPhoto = { image_url?: string; student_id?: number | string | null; student_ids?: (number | string)[]; tag_state?: "unreviewed" | "individual" | "group" | "legacy" };
export function photoStudentIds(photo: StudentPhoto) {
  return (photo.student_ids ?? (photo.student_id == null ? [] : [photo.student_id])).map(Number).filter(id => Number.isInteger(id) && id > 0);
}
export function photosForStudent<T extends StudentPhoto>(photos: T[] = [], studentId?: number): T[] {
  if (!studentId) return photos;
  const hasIndividual = photos.some(photo => photoStudentIds(photo).length > 0);
  return photos.filter(photo => {
    if (photo.tag_state === "unreviewed") return false;
    if (photo.tag_state === "group") return photoStudentIds(photo).length === 0;
    if (photoStudentIds(photo).includes(studentId)) return true;
    // Historical galleries retain their former all-untagged behavior.
    return !hasIndividual && (!photo.tag_state || photo.tag_state === "legacy") && photoStudentIds(photo).length === 0;
  });
}
export function studentRemark(remarks: { student_id: number | string; remark: string }[] = [], studentId?: number) {
  return studentId ? remarks.find(entry => Number(entry.student_id) === studentId)?.remark.trim() : undefined;
}
