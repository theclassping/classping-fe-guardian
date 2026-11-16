// The album as the preview and the PDF both read it: a source (what the school shared) and a document (pages, laid out).
import type { Period } from "./period";
import type { Tone } from "./theme";

export type AlbumSubject =
  | { kind: "child"; id: number; name: string; nickname: string; initials: string; className: string }
  | { kind: "class"; id: number; name: string; initials: string; className: string };

export type AlbumPhoto = { id: string; url: string; caption?: string };

export type AlbumActivity = {
  id: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  description?: string;
  teacher?: string;
  /** The teacher's note on this child (ActivityStudent.remark); absent for class albums. */
  remark?: string;
  /** When the school last edited the activity (ISO); part of the fingerprint that tells a stored album is stale. */
  updatedAt?: string;
  photos: AlbumPhoto[];
};

export type AlbumSchool = { name: string; branchName?: string };

export type AlbumSource = {
  subject: AlbumSubject;
  period: Period;
  school: AlbumSchool;
  activities: AlbumActivity[];
  /** ISO timestamp; printed on the back cover. */
  generatedAt: string;
};

/** A photo with its scrapbook placement decided: tilt in degrees and which washi tape holds it. */
export type PlacedPhoto = AlbumPhoto & { tilt: number; tape: Tone };

export type PhotoLayout = "none" | "hero" | "pair" | "grid4" | "grid6";

export type ActivityEntry = {
  activityId: string;
  title: string;
  /** "Selasa, 6 Oktober 2026" */
  dateLabel: string;
  teacher?: string;
  description?: string;
  remark?: string;
  photos: PlacedPhoto[];
  layout: PhotoLayout;
  /** This page continues an activity whose photos did not fit on one page. */
  continuation: boolean;
  tone: Tone;
};

export type MonthCalendar = {
  year: number;
  /** 1–12 */
  month: number;
  /** "Oktober 2026" */
  label: string;
  /** Rows of 7, Monday first; null for cells outside the month. */
  weeks: (number | null)[][];
  activeDays: number[];
};

export type AlbumPage =
  | { kind: "cover"; tone: Tone; title: string; periodLabel: string; subject: AlbumSubject; school: AlbumSchool }
  | { kind: "summary"; periodLabel: string; stats: { activities: number; photos: number; days: number }; months: MonthCalendar[]; topActivities: { title: string; count: number }[] }
  | { kind: "monthDivider"; tone: Tone; label: string; activityCount: number; photoCount: number; heroPhoto?: PlacedPhoto }
  | { kind: "activity"; entries: ActivityEntry[] }
  | { kind: "backCover"; school: AlbumSchool; generatedLabel: string; subjectName: string };

export type AlbumDocument = {
  period: Period;
  /** Photos per month of the period, oldest first; drives splitting a long album into several PDFs. */
  monthPhotoCounts: { year: number; month: number; photos: number }[];
  title: string;
  fileName: string;
  periodLabel: string;
  subject: AlbumSubject;
  pages: AlbumPage[];
  /** Every photo the document shows, once; the PDF route fetches these. */
  photoUrls: string[];
};
