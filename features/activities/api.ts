// Activities shared with the selected child, read on the server.
import { formatLongDate, formatTime } from "@/lib/format";
import { positiveId, recordsOrNull } from "@/lib/records";
import { get } from "@/lib/server-api";
import { photosForStudent, studentCaption, type StudentPhoto } from "@/features/activities/visibility";
import type { Activity, ApiActivity, ApiClassTeacher, ApiStudentLink } from "@/features/activities/types";

/** One lookup per class-teacher assignment while building a list. */
export type TeacherCache = Map<string, Promise<ApiClassTeacher | null>>;

function idsFromLinks(links: ApiStudentLink[] = []) {
  return links.map((link) => positiveId(link.student_id ?? link.student ?? link.id)).filter((id): id is number => id !== undefined);
}

function imageStudentIds(image: StudentPhoto) {
  return (image.student_ids ?? (image.student_id == null ? [] : [image.student_id])).map(positiveId).filter((id): id is number => id !== undefined);
}

/** An activity is the child's when the child takes part or is tagged in a photo; one without any assignment is for the whole class. */
export function activityMatchesStudent(activity: ApiActivity, studentId: number) {
  const participantIds = idsFromLinks(activity.activity_students ?? activity.students ?? []);
  const taggedImages = activity.activity_images ?? [];
  const hasTaggedImages = taggedImages.some((image) => image.student_id != null || Array.isArray(image.student_ids));
  if (!participantIds.length && !hasTaggedImages) return true;
  return participantIds.includes(studentId) || taggedImages.some((image) => imageStudentIds(image).includes(studentId));
}

function nameFromTeacher(value?: ApiClassTeacher | string | number) {
  if (typeof value === "string") return value.trim() || undefined;
  if (!value || typeof value === "number") return undefined;
  const staff = value.staff;
  return value.teacher_name || value.name || staff?.name ||
    [value.first_name || staff?.first_name, value.last_name || staff?.last_name].filter(Boolean).join(" ") || undefined;
}

/** Shown when no teacher name can be read; the album leaves the teacher out instead. */
export const UNKNOWN_TEACHER = "Nama guru belum tersedia";

/** The teacher's name, from the activity itself or its class-teacher assignment. */
export async function teacherForActivity(activity: ApiActivity, cache: TeacherCache) {
  const directName = activity.teacher_name || nameFromTeacher(activity.teacher) || nameFromTeacher(activity.class_teacher as ApiClassTeacher | number | undefined);
  if (directName) return directName;
  const assignmentId = activity.class_teacher_id ?? (typeof activity.class_teacher === "number" || typeof activity.class_teacher === "string" ? activity.class_teacher : activity.class_teacher?.id);
  if (!assignmentId) return UNKNOWN_TEACHER;
  const key = String(assignmentId);
  let lookup = cache.get(key);
  if (!lookup) {
    lookup = get<ApiClassTeacher>(`/api/class-teachers/${encodeURIComponent(key)}/`);
    cache.set(key, lookup);
  }
  return nameFromTeacher((await lookup) || undefined) || UNKNOWN_TEACHER;
}

/** Backend activity → card/detail view. Missing fields get neutral defaults, never invented content. */
function mapActivity(item: ApiActivity, { slug, studentId, teacher, noteFallback }: { slug: string; studentId?: number; teacher: string; noteFallback: string }): Activity {
  const visibleImages = photosForStudent(item.activity_images, studentId);
  const description = item.description || "Catatan aktivitas dari sekolah.";
  return {
    slug,
    title: item.name || "Aktivitas sekolah",
    date: formatLongDate(item.activity_date, "Tanggal belum tersedia"),
    time: formatTime(item.activity_date),
    emoji: "🎨",
    secondaryEmoji: "📷",
    tone: "mint",
    photos: visibleImages.length,
    summary: description,
    description,
    teacher,
    // The note is the teacher's caption on this child's own photos; the description is shown separately.
    teacherNote: studentCaption(item.activity_images, studentId) || noteFallback,
    skills: [],
    imageUrls: visibleImages.map((image) => image.image_url).filter((url): url is string => Boolean(url)),
    occurredAt: item.activity_date || item.updated_at || item.created_at,
  };
}

/** Published activities of the child (raw), shared by the activity list and the notifications. */
export async function publishedActivitiesFor(studentId?: number) {
  const filters = new URLSearchParams();
  if (studentId !== undefined) filters.set("student_id", String(studentId));
  filters.set("is_publish", "true");
  const items = recordsOrNull<ApiActivity>(await get(`/api/activities/?${filters.toString()}`)) || [];
  return items.filter((item) => item.is_publish !== false && (!studentId || activityMatchesStudent(item, studentId)));
}

export async function activitiesForBackend(studentId?: number) {
  const teacherCache: TeacherCache = new Map();
  const items = await publishedActivitiesFor(studentId);
  return Promise.all(items.map(async (item, index) => mapActivity(item, {
    studentId,
    slug: String(item.id ?? item.name ?? `activity-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    teacher: await teacherForActivity(item, teacherCache),
    noteFallback: "Informasi aktivitas tersedia dari sekolah.",
  })));
}

export async function activityForBackend(slug: string, studentId?: number) {
  const suffix = studentId ? `?student_id=${studentId}` : "";
  const item = await get<ApiActivity>(`/api/activities/${encodeURIComponent(slug)}/${suffix}`);
  if (!item || item.is_publish === false) return null;
  if (studentId && !activityMatchesStudent(item, studentId)) return null;
  return mapActivity(item, { slug, studentId, teacher: await teacherForActivity(item, new Map()), noteFallback: "Belum ada catatan khusus dari guru." });
}
