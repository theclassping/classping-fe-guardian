// Semesters for the album button when the activity list shows "Semua": Semester 1 runs July–December of the
// academic year's first calendar year, Semester 2 runs January–June of the next. Pure, so it is unit-tested.
import type { Period } from "@/features/album/core/period";
import type { DayKey } from "@/features/activities/filter";

export type Semester = 1 | 2;

/** The calendar year an academic year starts in: July 2026–June 2027 → 2026. */
export function academicYearOf(day: DayKey) {
  const [year, month] = day.split("-").map(Number);
  return month >= 7 ? year : year - 1;
}

/** Academic years (start years) that have at least one of the days, newest first; the current one when there are none. */
export function academicYearsOf(days: readonly DayKey[], today: DayKey): number[] {
  const years = new Set(days.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)).map(academicYearOf));
  if (years.size === 0) years.add(academicYearOf(today));
  return [...years].sort((a, b) => b - a);
}

export const academicYearLabel = (year: number) => `${year}/${year + 1}`;

export function semesterPeriod(year: number, semester: Semester): Period {
  return semester === 1
    ? { kind: "range", from: `${year}-07-01`, to: `${year}-12-31` }
    : { kind: "range", from: `${year + 1}-01-01`, to: `${year + 1}-06-30` };
}

export const semesterLabel = (year: number, semester: Semester) =>
  semester === 1 ? `Semester 1 · Juli–Desember ${year}` : `Semester 2 · Januari–Juni ${year + 1}`;

/** Photos per month of a range period, from (day, photo count) pairs; months without photos count zero. */
export function monthPhotoCountsFor(items: readonly { day: DayKey | undefined; photos: number }[], period: Period) {
  const { from, to } = period.kind === "range" ? period : { from: "", to: "" };
  const counts = new Map<string, number>();
  for (let [year, month] = from.split("-").map(Number); `${year}-${String(month).padStart(2, "0")}` <= to.slice(0, 7); month === 12 ? (year++, month = 1) : month++) {
    counts.set(`${year}-${String(month).padStart(2, "0")}`, 0);
  }
  for (const item of items) {
    if (!item.day || item.day < from || item.day > to) continue;
    const key = item.day.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + item.photos);
  }
  return [...counts].map(([key, photos]) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), photos }));
}
