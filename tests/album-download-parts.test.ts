import { describe, expect, it } from "vitest";
import { doodlesIn, entryZones } from "classping-album/doodles";
import { buildAlbum, downloadPeriodsFor } from "classping-album/model";
import { parsePeriodParam, periodLabel, periodParam, periodRange } from "classping-album/period";
import type { AlbumActivity, AlbumSource } from "classping-album/types";

function activity(id: string, date: string, photos: number): AlbumActivity {
  return { id, title: `Kegiatan ${id}`, date, photos: Array.from({ length: photos }, (_, i) => ({ id: `${id}-${i}`, url: `mem://${id}/${i}` })) };
}
const year = { kind: "year" as const, id: "3", label: "2026/2027", start: "2026-07-01", end: "2027-06-30" };
const source = (activities: AlbumActivity[], period: AlbumSource["period"]): AlbumSource => ({
  subject: { kind: "child", id: 7, name: "Aisyah Putri", nickname: "Aisyah", initials: "AP", className: "Kelas A" },
  period, school: { name: "TK Ceria" }, activities, generatedAt: "2026-11-13T03:00:00Z",
});

describe("range periods", () => {
  it("round-trips through the URL and labels month spans", () => {
    const range = parsePeriodParam("range:2026-07-01:2026-10-31");
    expect(range).toEqual({ kind: "range", from: "2026-07-01", to: "2026-10-31" });
    expect(periodParam(range!)).toBe("range:2026-07-01:2026-10-31");
    expect(periodRange(range!)).toEqual({ from: "2026-07-01", to: "2026-10-31" });
    expect(periodLabel(range!)).toBe("Juli–Oktober 2026");
    expect(periodLabel({ kind: "range", from: "2026-11-01", to: "2027-02-28" })).toBe("November 2026–Februari 2027");
    expect(parsePeriodParam("range:2026-10-31:2026-07-01")).toBeUndefined();
  });
  it("gives a range album month dividers like a year album", () => {
    const doc = buildAlbum(source([activity("a", "2026-08-03", 1), activity("b", "2026-09-09", 1)], { kind: "range", from: "2026-07-01", to: "2026-09-30" }));
    expect(doc.pages.map((p) => p.kind)).toEqual(["cover", "summary", "monthDivider", "activity", "monthDivider", "activity", "backCover"]);
    expect(doc.monthPhotoCounts).toEqual([{ year: 2026, month: 7, photos: 0 }, { year: 2026, month: 8, photos: 1 }, { year: 2026, month: 9, photos: 1 }]);
  });
});

describe("downloadPeriodsFor", () => {
  it("keeps a small album as one PDF and a month album always as one", () => {
    const small = buildAlbum(source([activity("a", "2026-08-03", 50), activity("b", "2027-03-09", 60)], year));
    expect(downloadPeriodsFor(small)).toEqual([year]);
    const bigMonth = buildAlbum(source([activity("a", "2026-10-03", 200)], { kind: "month", year: 2026, month: 10 }));
    expect(downloadPeriodsFor(bigMonth)).toEqual([{ kind: "month", year: 2026, month: 10 }]);
  });
  it("splits a big year into consecutive month runs under the cap", () => {
    const doc = buildAlbum(source([activity("jul", "2026-07-03", 50), activity("sep", "2026-09-09", 60), activity("nov", "2026-11-01", 30), activity("mar", "2027-03-01", 90), activity("jun", "2027-06-01", 10)], year));
    const parts = downloadPeriodsFor(doc, 120);
    // Months are packed greedily: July–October holds 110, November–May exactly 120, June the rest.
    expect(parts).toEqual([
      { kind: "range", from: "2026-07-01", to: "2026-10-31" },
      { kind: "range", from: "2026-11-01", to: "2027-05-31" },
      { kind: "range", from: "2027-06-01", to: "2027-06-30" },
    ]);
    expect(parts.map((part) => periodLabel(part))).toEqual(["Juli–Oktober 2026", "November 2026–Mei 2027", "Juni 2027"]);
  });
});

describe("doodles", () => {
  it("are deterministic, stay inside their zones and skip zones that are too small", () => {
    const zones = entryZones({ top: 36, height: 770, compact: false, slots: [{ x: 127, y: 136, width: 340, height: 300 }], photosTop: 136, photosBottom: 436, textBottom: 520, bubbleTop: 714 });
    const first = doodlesIn("entry:a:0", zones);
    expect(first).toEqual(doodlesIn("entry:a:0", zones));
    expect(first.length).toBeGreaterThan(0);
    for (const doodle of first) {
      const zone = zones.find((z) => doodle.x >= z.x - 0.01 && doodle.y >= z.y - 0.01 && doodle.x + doodle.size <= z.x + z.width + 0.01 && doodle.y + doodle.size <= z.y + z.height + 0.01);
      expect(zone, `${doodle.name} at ${doodle.x},${doodle.y}`).toBeDefined();
    }
    expect(doodlesIn("x", [{ x: 0, y: 0, width: 10, height: 300 }])).toEqual([]);
  });
});
