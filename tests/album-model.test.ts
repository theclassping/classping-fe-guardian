import { describe, expect, it } from "vitest";
import { buildAlbum, calendarFor, topActivities } from "classping-album/model";
import { activityPages, entriesFor, layoutFor } from "classping-album/paginate";
import { monthsBetween, parsePeriodParam, periodParam, periodRange } from "classping-album/period";
import type { AlbumActivity, AlbumSource } from "classping-album/types";

function activity(id: string, date: string, photos: number, extra: Partial<AlbumActivity> = {}): AlbumActivity {
  return { id, title: `Kegiatan ${id}`, date, photos: Array.from({ length: photos }, (_, i) => ({ id: `${id}-${i}`, url: `https://example.test/${id}/${i}.jpg` })), ...extra };
}

const source = (activities: AlbumActivity[], period: AlbumSource["period"] = { kind: "month", year: 2026, month: 10 }): AlbumSource => ({
  subject: { kind: "child", id: 7, name: "Aisyah Putri", nickname: "Aisyah", initials: "AP", className: "Kelas A" },
  period,
  school: { name: "TK Ceria", branchName: "Cabang Utama" },
  activities,
  generatedAt: "2026-11-13T03:00:00Z",
});

describe("periods", () => {
  it("bounds a month inclusively and labels it in Indonesian", () => {
    expect(periodRange({ kind: "month", year: 2026, month: 2 })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodParam({ kind: "month", year: 2026, month: 10 })).toBe("2026-10");
    expect(parsePeriodParam("2026-13")).toBeUndefined();
    expect(parsePeriodParam("year:3", [{ id: "3", label: "2026/2027", start: "2026-07-01", end: "2027-06-30" }])?.kind).toBe("year");
    expect(monthsBetween("2026-11-01", "2027-02-28").map((m) => m.month)).toEqual([11, 12, 1, 2]);
  });
});

describe("photo layouts", () => {
  it("picks the arrangement by photo count", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(layoutFor)).toEqual(["none", "hero", "pair", "grid4", "grid4", "grid6", "grid6"]);
  });
  it("spills a 9-photo activity onto a continuation page that repeats no text", () => {
    const entries = entriesFor(activity("a", "2026-10-06", 9, { remark: "Hebat!", description: "Cerita" }));
    expect(entries.map((e) => e.photos.length)).toEqual([6, 3]);
    expect(entries[0]).toMatchObject({ layout: "grid6", continuation: false, remark: "Hebat!" });
    expect(entries[1]).toMatchObject({ layout: "grid4", continuation: true, remark: undefined, description: undefined });
  });
  it("is deterministic: the same photo always gets the same tilt and tape", () => {
    const [first] = entriesFor(activity("a", "2026-10-06", 1));
    const [again] = entriesFor(activity("a", "2026-10-06", 1));
    expect(first.photos[0]).toEqual(again.photos[0]);
    expect(Math.abs(first.photos[0].tilt)).toBeLessThanOrEqual(4);
  });
  it("pairs consecutive short activities on one page, never one with a remark", () => {
    const pages = activityPages([activity("a", "2026-10-01", 1), activity("b", "2026-10-02", 2), activity("c", "2026-10-03", 1, { remark: "Rajin" }), activity("d", "2026-10-04", 1)]);
    expect(pages.map((p) => (p.kind === "activity" ? p.entries.map((e) => e.activityId) : []))).toEqual([["a", "b"], ["c"], ["d"]]);
  });
});

describe("summary", () => {
  it("builds a Monday-first calendar with the active days marked", () => {
    const calendar = calendarFor(2026, 10, ["2026-10-01", "2026-10-06", "2026-10-06", "2026-09-30"]);
    expect(calendar.weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(calendar.weeks.at(-1)?.at(-1)).toBeNull();
    expect(calendar.activeDays).toEqual([1, 6]);
    expect(calendar.label).toBe("Oktober 2026");
  });
  it("ranks repeated activity names", () => {
    const items = [activity("1", "2026-10-01", 0, { title: "Senam Pagi" }), activity("2", "2026-10-02", 0, { title: "senam pagi " }), activity("3", "2026-10-03", 0, { title: "Melukis" })];
    expect(topActivities(items)).toEqual([{ title: "Senam Pagi", count: 2 }, { title: "Melukis", count: 1 }]);
  });
});

describe("buildAlbum", () => {
  it("makes cover, summary, activity pages and back cover for a month, in date order", () => {
    const doc = buildAlbum(source([activity("late", "2026-10-20", 3, { remark: "x" }), activity("early", "2026-10-02", 1, { remark: "y" })]));
    expect(doc.pages.map((p) => p.kind)).toEqual(["cover", "summary", "activity", "activity", "backCover"]);
    expect(doc.pages[2]).toMatchObject({ entries: [{ activityId: "early" }] });
    expect(doc.pages[1]).toMatchObject({ stats: { activities: 2, photos: 4, days: 2 } });
    expect(doc.fileName).toBe("album-aisyah-2026-10.pdf");
    expect(doc.photoUrls).toHaveLength(4);
  });
  it("adds a divider only for months that have activities in a year album", () => {
    const year = { kind: "year" as const, id: "3", label: "2026/2027", start: "2026-07-01", end: "2027-06-30" };
    const doc = buildAlbum(source([activity("a", "2026-08-03", 2, { remark: "r" }), activity("b", "2026-10-09", 1, { remark: "r" })], year));
    const kinds = doc.pages.map((p) => p.kind);
    expect(kinds).toEqual(["cover", "summary", "monthDivider", "activity", "monthDivider", "activity", "backCover"]);
    expect(doc.pages[1]).toMatchObject({ months: expect.arrayContaining([expect.objectContaining({ month: 7 })]) });
    expect((doc.pages[1] as { months: unknown[] }).months).toHaveLength(12);
    expect(doc.pages[2]).toMatchObject({ label: "Agustus 2026", activityCount: 1, photoCount: 2 });
  });
  it("still produces a readable album for an empty period", () => {
    const doc = buildAlbum(source([]));
    expect(doc.pages.map((p) => p.kind)).toEqual(["cover", "summary", "backCover"]);
  });
});
