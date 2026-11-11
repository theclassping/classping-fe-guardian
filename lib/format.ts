// Display formatting shared by the server and the browser. Dates are shown in the school's timezone.
const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 250000 → "Rp 250.000"; "—" for anything that is not a number. */
export function rupiah(value: string | number, currency = "IDR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/**
 * "Selasa, 10 November 2026 pukul 15.00 WIB". "—" when missing; an unparseable value is shown as is.
 * `time: false` drops the time, `zoneName: false` drops "WIB".
 */
export function formatDateTime(value?: string | null, { time = true, zoneName = true }: { time?: boolean; zoneName?: boolean } = {}) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE,
    ...(time ? { hour: "2-digit", minute: "2-digit", ...(zoneName ? { timeZoneName: "short" } : {}) } : {}),
  }).format(date);
}

/** "10 November 2026", or `fallback` when missing or unparseable. */
export function formatLongDate(value: string | undefined, fallback: string) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(LOCALE, { dateStyle: "long", timeZone: TIME_ZONE }).format(date) : fallback;
}

/** "November 2026", or `fallback`. */
export function formatMonthYear(value: string | undefined, fallback: string) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: TIME_ZONE }).format(date) : fallback;
}

/** "09.30", or "" when missing. */
export function formatTime(value?: string) {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(LOCALE, { timeStyle: "short", timeZone: TIME_ZONE }).format(date) : "";
}

/** Joins name parts, skipping empty ones: fullName("Gita", null, "Gateway") → "Gita Gateway". */
export function fullName(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Up to two initials: initialsOf("Gita Gateway") → "GG". */
export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

/** API enum to label: titleize("payment_submitted") → "Payment Submitted"; "—" when empty. */
export function titleize(value?: string) {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Ends free text (e.g. a rejection reason typed by staff) with exactly one full stop. */
export function asSentence(text: string) {
  return `${text.trim().replace(/[.!?]+$/, "")}.`;
}
