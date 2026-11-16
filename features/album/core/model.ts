// From what the school shared to the pages of the album.
import { activityPages, placePhoto, toneFor } from "./paginate";
import { daysIn, monthLabel, monthsBetween, periodLabel, periodParam, periodRange, type Period } from "./period";
import type { AlbumActivity, AlbumDocument, AlbumPage, AlbumSource, MonthCalendar } from "./types";

function subjectName(source: AlbumSource) {
  return source.subject.kind === "child" ? source.subject.nickname || source.subject.name : source.subject.name;
}

/** The month grid, Monday first, with the days that had activities. */
export function calendarFor(year: number, month: number, activeDates: string[]): MonthCalendar {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const activeDays = [...new Set(activeDates.filter((date) => date.startsWith(prefix)).map((date) => Number(date.slice(8, 10))))].sort((a, b) => a - b);
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: daysIn(year, month) }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, label: monthLabel(year, month), weeks, activeDays };
}

/** The three most repeated activity names ("Senam pagi" ×4). */
export function topActivities(activities: AlbumActivity[], limit = 3) {
  const counts = new Map<string, { title: string; count: number }>();
  for (const activity of activities) {
    const key = activity.title.trim().toLowerCase();
    const entry = counts.get(key) ?? { title: activity.title.trim(), count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, limit);
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "album";
}

export function buildAlbum(source: AlbumSource): AlbumDocument {
  const activities = [...source.activities].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const label = periodLabel(source.period);
  const name = subjectName(source);
  const range = periodRange(source.period);
  const dates = activities.map((activity) => activity.date);
  const photoCount = activities.reduce((sum, activity) => sum + activity.photos.length, 0);
  const tone = toneFor(`subject:${source.subject.kind}:${source.subject.id}`);

  const pages: AlbumPage[] = [
    { kind: "cover", tone, title: `Album Digital ${name}`, periodLabel: label, subject: source.subject, school: source.school },
    {
      kind: "summary",
      periodLabel: label,
      stats: { activities: activities.length, photos: photoCount, days: new Set(dates).size },
      months: monthsBetween(range.from, range.to).map(({ year, month }) => calendarFor(year, month, dates)),
      topActivities: topActivities(activities),
    },
  ];

  if (source.period.kind !== "month") {
    for (const { year, month } of monthsBetween(range.from, range.to)) {
      const prefix = `${year}-${String(month).padStart(2, "0")}-`;
      const inMonth = activities.filter((activity) => activity.date.startsWith(prefix));
      if (!inMonth.length) continue;
      const hero = inMonth.flatMap((activity) => activity.photos)[0];
      pages.push({
        kind: "monthDivider",
        tone: toneFor(`${year}-${month}`),
        label: monthLabel(year, month),
        activityCount: inMonth.length,
        photoCount: inMonth.reduce((sum, activity) => sum + activity.photos.length, 0),
        heroPhoto: hero ? placePhoto(hero) : undefined,
      });
      pages.push(...activityPages(inMonth));
    }
  } else {
    pages.push(...activityPages(activities));
  }

  const generatedLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(source.generatedAt));
  pages.push({ kind: "backCover", school: source.school, generatedLabel, subjectName: source.subject.kind === "class" ? `teman-teman ${name}` : name });

  return {
    period: source.period,
    monthPhotoCounts: monthsBetween(range.from, range.to).map(({ year, month }) => {
      const prefix = `${year}-${String(month).padStart(2, "0")}-`;
      return { year, month, photos: activities.filter((activity) => activity.date.startsWith(prefix)).reduce((sum, activity) => sum + activity.photos.length, 0) };
    }),
    title: `Album Digital ${name} · ${label}`,
    fileName: `album-${slug(name)}-${periodParam(source.period).replace(/:/g, "-")}.pdf`,
    periodLabel: label,
    subject: source.subject,
    pages,
    photoUrls: [...new Set(activities.flatMap((activity) => activity.photos.map((photo) => photo.url)))],
  };
}

/** More photos than this would not render within a serverless function's time budget, so bigger albums download in parts. */
export const MAX_PHOTOS_PER_PDF = 120;

type MonthCount = AlbumDocument["monthPhotoCounts"][number];

function rangeOf(months: MonthCount[]): Period {
  const first = months[0];
  const last = months[months.length - 1];
  return { kind: "range", from: `${first.year}-${String(first.month).padStart(2, "0")}-01`, to: `${last.year}-${String(last.month).padStart(2, "0")}-${String(daysIn(last.year, last.month)).padStart(2, "0")}` };
}

const photosIn = (months: MonthCount[]) => months.reduce((sum, month) => sum + month.photos, 0);

/** Consecutive runs of months, oldest first, each within `max` photos. A single month over the cap still becomes its own run. */
function monthRuns(months: MonthCount[], max: number): Period[] {
  const parts: Period[] = [];
  let run: MonthCount[] = [];
  for (const month of months) {
    if (run.length && photosIn(run) + month.photos > max) {
      parts.push(rangeOf(run));
      run = [];
    }
    run.push(month);
  }
  if (run.length) parts.push(rangeOf(run));
  return parts;
}

/** An academic year's two halves: up to December, and from January on. Empty when the months do not cross a new year. */
export function semesterHalves(months: MonthCount[]): [MonthCount[], MonthCount[]] | undefined {
  const january = months.findIndex((month, index) => index > 0 && month.month === 1);
  return january > 0 ? [months.slice(0, january), months.slice(january)] : undefined;
}

/**
 * The periods to download: the album's own period when it fits in one PDF. A bigger album splits by semester
 * first (July–December, January–June), because that is how families think of a school year; a semester that
 * is itself over the cap, or a period with no new year in it, splits into consecutive month runs instead.
 */
export function downloadPeriodsFor(album: Pick<AlbumDocument, "period" | "monthPhotoCounts">, max = MAX_PHOTOS_PER_PDF): Period[] {
  if (album.period.kind === "month" || photosIn(album.monthPhotoCounts) <= max) return [album.period];
  const halves = semesterHalves(album.monthPhotoCounts);
  if (!halves) return monthRuns(album.monthPhotoCounts, max);
  return halves.flatMap((half) => (photosIn(half) <= max ? [rangeOf(half)] : monthRuns(half, max)));
}

export type DownloadPart = { period: Period; label: string; photos: number };

/** The download parts with the labels the buttons show: "Semester 1 · Juli–Desember 2026", or "Bagian 2 · …" for other splits. */
export function downloadPartsFor(album: Pick<AlbumDocument, "period" | "monthPhotoCounts">, max = MAX_PHOTOS_PER_PDF): DownloadPart[] {
  const periods = downloadPeriodsFor(album, max);
  const halves = semesterHalves(album.monthPhotoCounts);
  const semesters = halves ? halves.map((half) => periodParam(rangeOf(half))) : [];
  return periods.map((period, index) => {
    const months = album.monthPhotoCounts.filter((month) => {
      const key = `${month.year}-${String(month.month).padStart(2, "0")}`;
      const { from, to } = periodRange(period);
      return key >= from.slice(0, 7) && key <= to.slice(0, 7);
    });
    const semester = periods.length === 2 ? semesters.indexOf(periodParam(period)) : -1;
    const label = periods.length === 1 ? periodLabel(period) : semester >= 0 ? `Semester ${semester + 1} · ${periodLabel(period)}` : `Bagian ${index + 1} · ${periodLabel(period)}`;
    return { period, label, photos: photosIn(months) };
  });
}
