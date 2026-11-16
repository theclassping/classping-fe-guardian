// The stretch of time an album covers: one month, or an inclusive range of days (a school day, week, 30 days, a semester).
const LOCALE = "id-ID";

export type Period =
  | { kind: "month"; year: number; month: number }
  /** Inclusive ISO dates. */
  | { kind: "range"; from: string; to: string };

const pad = (value: number) => String(value).padStart(2, "0");

/** Days in a month: daysIn(2026, 2) → 28. */
export function daysIn(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "Oktober 2026" */
export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Inclusive ISO bounds of the period. */
export function periodRange(period: Period) {
  if (period.kind === "range") return { from: period.from, to: period.to };
  return { from: `${period.year}-${pad(period.month)}-01`, to: `${period.year}-${pad(period.month)}-${pad(daysIn(period.year, period.month))}` };
}

/** "Juli–Oktober 2026", or "Juli 2026–Februari 2027" across years. */
export function rangeLabel(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  if (fromYear === toYear && fromMonth === toMonth) return monthLabel(fromYear, fromMonth);
  const monthName = (year: number, month: number) => new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return fromYear === toYear ? `${monthName(fromYear, fromMonth)}–${monthName(toYear, toMonth)} ${toYear}` : `${monthLabel(fromYear, fromMonth)}–${monthLabel(toYear, toMonth)}`;
}

export function periodLabel(period: Period) {
  if (period.kind === "range") return rangeLabel(period.from, period.to);
  return monthLabel(period.year, period.month);
}

/** URL form: "2026-10" or "range:2026-07-01:2026-10-31". */
export function periodParam(period: Period) {
  if (period.kind === "range") return `range:${period.from}:${period.to}`;
  return `${period.year}-${pad(period.month)}`;
}

/** Reads a period from its URL form; unknown values give `undefined`. */
export function parsePeriodParam(value: string | undefined): Period | undefined {
  if (!value) return undefined;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) {
    const [, year, monthNumber] = month;
    const parsed = { kind: "month" as const, year: Number(year), month: Number(monthNumber) };
    return parsed.month >= 1 && parsed.month <= 12 ? parsed : undefined;
  }
  const range = /^range:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(value);
  if (range) return range[1] <= range[2] ? { kind: "range", from: range[1], to: range[2] } : undefined;
  return undefined;
}

/** Every month from `from` to `to`, inclusive, oldest first. */
export function monthsBetween(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const months: { year: number; month: number }[] = [];
  for (let year = fromYear, month = fromMonth; year < toYear || (year === toYear && month <= toMonth); month === 12 ? (year++, month = 1) : month++) {
    months.push({ year, month });
  }
  return months;
}

/** Distinct months that have activities, newest first, from ISO dates. */
export function monthsWithActivities(dates: string[]) {
  const seen = new Map<string, { year: number; month: number }>();
  for (const value of dates) {
    const [year, month] = value.split("-").map(Number);
    if (year && month) seen.set(`${year}-${pad(month)}`, { year, month });
  }
  return [...seen.values()].sort((a, b) => b.year - a.year || b.month - a.month);
}

/** The month of a date in Jakarta time, for "this month" defaults. */
export function currentMonth(now = new Date()): Period {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Jakarta" }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { kind: "month", year: read("year"), month: read("month") };
}

/** "Selasa, 6 Oktober 2026" from an ISO date; the raw value when it does not parse. */
export function dateLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "6 Okt" for date pills. */
export function shortDateLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}
