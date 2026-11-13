// The album's source for the selected child, read on the server with the guardian's token.
import { positiveId, records, recordsOrNull } from "@/lib/records";
import { get } from "@/lib/server-api";
import { UNKNOWN_TEACHER, activityMatchesStudent, teacherForActivity, type TeacherCache } from "@/features/activities/api";
import { photosForStudent } from "@/features/activities/visibility";
import type { ApiActivity } from "@/features/activities/types";
import type { ApiAcademicYear, ChildProfile, GuardianSchool } from "@/features/family/types";
import { monthsWithActivities, periodRange, type AcademicYearOption, type Period } from "classping-album/period";
import type { AlbumActivity, AlbumSource } from "classping-album/types";

type ApiAcademicYearDates = ApiAcademicYear & { start_date?: string; end_date?: string };

/** Published activities of the child within the period (raw). */
async function publishedActivitiesBetween(studentId: number, from: string, to: string) {
  const filters = new URLSearchParams({ student_id: String(studentId), is_publish: "true", date_from: from, date_to: to });
  const items = recordsOrNull<ApiActivity>(await get(`/api/activities/?${filters.toString()}`)) || [];
  return items.filter((item) => item.is_publish !== false && activityMatchesStudent(item, studentId));
}

/** Backend activity → album activity: the child's visible photos, captions and the teacher's remark on the child. */
async function albumActivity(item: ApiActivity, studentId: number, cache: TeacherCache): Promise<AlbumActivity | null> {
  const id = item.id ?? item.name;
  const date = item.activity_date?.slice(0, 10);
  if (id == null || !date) return null;
  const photos = photosForStudent(item.activity_images, studentId)
    .filter((image) => Boolean(image.image_url))
    .map((image, index) => ({ id: String(image.id ?? `${id}-${index}`), url: image.image_url as string, caption: image.caption?.trim() || undefined }));
  // Remarks come in their own list; older backends put them on the student links.
  const remark = ((item.student_remarks ?? []).find((note) => positiveId(note.student_id) === studentId)?.remark
    ?? (item.activity_students ?? []).find((link) => positiveId(link.student_id ?? link.student) === studentId)?.remark)?.trim();
  return {
    id: String(id),
    title: item.name?.trim() || "Aktivitas sekolah",
    date,
    description: item.description?.trim() || undefined,
    teacher: await teacherForActivity(item, cache).then((name) => (name === UNKNOWN_TEACHER ? undefined : name)),
    remark: remark || undefined,
    photos,
  };
}

export async function albumSourceFor(studentId: number, period: Period, child: ChildProfile, school: GuardianSchool | null): Promise<AlbumSource> {
  const { from, to } = periodRange(period);
  const cache: TeacherCache = new Map();
  const items = await publishedActivitiesBetween(studentId, from, to);
  const activities = (await Promise.all(items.map((item) => albumActivity(item, studentId, cache)))).filter((item): item is AlbumActivity => item !== null);
  return {
    subject: { kind: "child", id: studentId, name: child.name, nickname: child.nickname || child.firstName, initials: child.initials, className: child.className },
    period,
    school: { name: school?.name || "Sekolah", branchName: school?.branch_name },
    activities,
    generatedAt: new Date().toISOString(),
  };
}

/** Months the child has published activities in, newest first, for the period picker. */
export async function albumMonthsFor(studentId: number) {
  const filters = new URLSearchParams({ student_id: String(studentId), is_publish: "true" });
  const items = recordsOrNull<ApiActivity>(await get(`/api/activities/?${filters.toString()}`)) || [];
  return monthsWithActivities(items.filter((item) => activityMatchesStudent(item, studentId)).map((item) => item.activity_date?.slice(0, 10) || ""));
}

/** Academic years of the child's branch, newest first; empty when the backend does not share them. */
export async function academicYearOptionsFor(branchId?: number): Promise<AcademicYearOption[]> {
  if (!branchId) return [];
  return records<ApiAcademicYearDates>(await get(`/api/academic-years/?branch_id=${branchId}`))
    .filter((year) => year.id != null && year.start_date && year.end_date && year.name)
    .map((year) => ({ id: String(year.id), label: year.name as string, start: (year.start_date as string).slice(0, 10), end: (year.end_date as string).slice(0, 10) }))
    .sort((a, b) => b.start.localeCompare(a.start));
}
