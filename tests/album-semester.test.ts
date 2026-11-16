import { describe, expect, it } from "vitest";
import { downloadPartsFor } from "@/features/album/core/model";
import { academicYearLabel, academicYearOf, academicYearsOf, monthPhotoCountsFor, semesterLabel, semesterPeriod } from "@/features/album/semester";

describe("academic years", () => {
  it("start in July", () => {
    expect(academicYearOf("2026-07-01")).toBe(2026);
    expect(academicYearOf("2026-06-30")).toBe(2025);
    expect(academicYearsOf(["2026-09-01", "2027-02-10", "2025-11-03", "bad"], "2026-11-16")).toEqual([2026, 2025]);
    expect(academicYearsOf([], "2026-03-01")).toEqual([2025]);
    expect(academicYearLabel(2026)).toBe("2026/2027");
  });
  it("map semesters to ranges and labels", () => {
    expect(semesterPeriod(2026, 1)).toEqual({ kind: "range", from: "2026-07-01", to: "2026-12-31" });
    expect(semesterPeriod(2026, 2)).toEqual({ kind: "range", from: "2027-01-01", to: "2027-06-30" });
    expect(semesterLabel(2026, 1)).toBe("Semester 1 · Juli–Desember 2026");
    expect(semesterLabel(2026, 2)).toBe("Semester 2 · Januari–Juni 2027");
  });
});

describe("monthPhotoCountsFor", () => {
  const items = [
    { day: "2026-07-03", photos: 50 }, { day: "2026-09-09", photos: 60 }, { day: "2026-11-01", photos: 30 },
    { day: "2027-03-01", photos: 90 }, { day: undefined, photos: 5 },
  ];
  it("counts every month of the semester, zero where nothing happened", () => {
    const months = monthPhotoCountsFor(items, semesterPeriod(2026, 1));
    expect(months.map((month) => month.photos)).toEqual([50, 0, 60, 0, 30, 0]);
    expect(months[0]).toEqual({ year: 2026, month: 7, photos: 50 });
    expect(monthPhotoCountsFor(items, semesterPeriod(2026, 2)).map((month) => month.photos)).toEqual([0, 0, 90, 0, 0, 0]);
  });
  it("feeds the part splitter when a semester is over the cap", () => {
    const period = semesterPeriod(2026, 1);
    const parts = downloadPartsFor({ period, monthPhotoCounts: monthPhotoCountsFor(items, period) }, 120);
    expect(parts.map((part) => [part.label, part.photos])).toEqual([["Bagian 1 · Juli–Oktober 2026", 110], ["Bagian 2 · November–Desember 2026", 30]]);
  });
});
