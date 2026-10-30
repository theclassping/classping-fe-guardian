import type { Activity } from "@/lib/data";

/** A calendar day as "YYYY-MM-DD" (no timezone), the unit the activity filter works in. */
export type DayKey = string;

export type ActivityDateFilter =
  | { mode: "all" }
  | { mode: "day"; date: DayKey }
  | { mode: "week"; date: DayKey };

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function keyFromParts(year: number, month: number, day: number): DayKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The calendar day of an instant in the school's timezone. */
export function dayKeyOf(date: Date, timeZone = "Asia/Jakarta"): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function todayKey(timeZone = "Asia/Jakarta"): DayKey {
  return dayKeyOf(new Date(), timeZone);
}

/**
 * The day an activity happened. Prefers the ISO timestamp; falls back to the
 * Indonesian long date ("3 September 2026") used by the demo data.
 */
export function activityDayKey(activity: Pick<Activity, "date" | "occurredAt">, timeZone = "Asia/Jakarta"): DayKey | undefined {
  if (activity.occurredAt) {
    const parsed = Date.parse(activity.occurredAt);
    if (!Number.isNaN(parsed)) return dayKeyOf(new Date(parsed), timeZone);
  }
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(activity.date.trim());
  if (!match) return undefined;
  const month = INDONESIAN_MONTHS[match[2].toLowerCase()];
  return month ? keyFromParts(Number(match[3]), month, Number(match[1])) : undefined;
}

function toUtc(key: DayKey) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): DayKey {
  const date = new Date(ms);
  return keyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function isDayKey(value: string | null | undefined): value is DayKey {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtc(value)));
}

export function shiftDay(key: DayKey, days: number): DayKey {
  return fromUtc(toUtc(key) + days * 86_400_000);
}

/** The school week (Monday to Friday) that contains the given day. */
export function schoolWeekOf(key: DayKey): { start: DayKey; end: DayKey } {
  const weekday = new Date(toUtc(key)).getUTCDay(); // 0 = Sunday
  const offsetToMonday = (weekday + 6) % 7;
  const start = shiftDay(key, -offsetToMonday);
  return { start, end: shiftDay(start, 4) };
}

export function filterActivitiesByDate<T extends Pick<Activity, "date" | "occurredAt">>(items: readonly T[], filter: ActivityDateFilter, timeZone = "Asia/Jakarta"): T[] {
  if (filter.mode === "all") return [...items];
  const range = filter.mode === "day" ? { start: filter.date, end: filter.date } : schoolWeekOf(filter.date);
  return items.filter((item) => {
    const key = activityDayKey(item, timeZone);
    return key !== undefined && key >= range.start && key <= range.end;
  });
}

const dayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function formatDayKey(key: DayKey) {
  return dayFormatter.format(new Date(toUtc(key)));
}

/** "Sen, 26 Okt – Jum, 30 Okt 2026" for the school week containing the day. */
export function formatSchoolWeek(key: DayKey) {
  const { start, end } = schoolWeekOf(key);
  return `${shortFormatter.format(new Date(toUtc(start)))} – ${shortFormatter.format(new Date(toUtc(end)))} ${end.slice(0, 4)}`;
}

/** "YYYY-MM" of a day. */
export function monthKeyOf(key: DayKey) {
  return key.slice(0, 7);
}

/** The first day of the month `months` away from the given day's month. */
export function shiftMonth(key: DayKey, months: number): DayKey {
  const [year, month] = key.split("-").map(Number);
  return fromUtc(Date.UTC(year, month - 1 + months, 1));
}

export function isWeekend(key: DayKey) {
  const weekday = new Date(toUtc(key)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/**
 * The calendar grid for the month containing `key`: full Monday-to-Sunday
 * rows from the week of the 1st through the week of the last day.
 */
export function calendarWeeks(key: DayKey): DayKey[][] {
  const first = shiftMonth(key, 0);
  const last = shiftDay(shiftMonth(key, 1), -1);
  const weeks: DayKey[][] = [];
  for (let cursor = schoolWeekOf(first).start; cursor <= last; cursor = shiftDay(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => shiftDay(cursor, index)));
  }
  return weeks;
}

const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatMonth(key: DayKey) {
  return monthFormatter.format(new Date(toUtc(key)));
}

/** Day of month without a leading zero, for calendar cells. */
export function dayOfMonth(key: DayKey) {
  return Number(key.slice(8, 10));
}
