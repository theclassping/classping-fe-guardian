import type { StudentPhoto } from "@/features/activities/visibility";

/** An activity as the list and detail pages show it. */
export type Activity = {
  slug: string;
  title: string;
  date: string;
  time: string;
  emoji: string;
  secondaryEmoji: string;
  tone: "peach" | "mint" | "lavender" | "blue";
  photos: number;
  summary: string;
  description: string;
  teacher: string;
  teacherNote: string;
  skills: string[];
  imageUrls?: string[];
  /** ISO timestamp of the activity, used to pick the latest one. */
  occurredAt?: string;
};

// Backend shapes (Django serializers), as far as the portal reads them.
export type ApiClassTeacher = {
  id?: number | string;
  teacher_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  staff?: { name?: string; first_name?: string; last_name?: string };
};

export type ApiStudentLink = { id?: number | string; student_id?: number | string; student?: number | string };

export type ApiActivity = {
  id?: number;
  name?: string;
  description?: string;
  activity_date?: string;
  created_at?: string;
  updated_at?: string;
  class_name?: string;
  class_teacher_id?: number | string;
  class_teacher?: ApiClassTeacher | number | string;
  teacher?: ApiClassTeacher | string;
  teacher_name?: string;
  activity_images?: StudentPhoto[];
  activity_students?: ApiStudentLink[];
  students?: ApiStudentLink[];
  is_publish?: boolean;
};
