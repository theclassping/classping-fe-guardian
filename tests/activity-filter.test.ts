import { describe, expect, it } from "vitest";
import {
  activityDayKey,
  calendarWeeks,
  dayKeyOf,
  dayOfMonth,
  formatMonth,
  isWeekend,
  monthKeyOf,
  shiftMonth,
  filterActivitiesByDate,
  formatDayKey,
  formatSchoolWeek,
  isDayKey,
  schoolWeekOf,
  shiftDay,
} from "@/lib/activityFilter";

const at = (occurredAt: string, title = occurredAt) => ({ title, date: "", occurredAt });

describe("activity day keys", () => {
  it("uses the school's timezone for ISO timestamps", () => {
    // 23:30 UTC on 26 Oct is already 27 Oct in Jakarta (UTC+7).
    expect(dayKeyOf(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
    expect(activityDayKey(at("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
  });

  it("falls back to the Indonesian long date of demo activities", () => {
    expect(activityDayKey({ date: "3 September 2026" })).toBe("2026-09-03");
    expect(activityDayKey({ date: "Tanggal belum tersedia" })).toBeUndefined();
  });

  it("validates and shifts day keys", () => {
    expect(isDayKey("2026-10-30")).toBe(true);
    expect(isDayKey("30/10/2026")).toBe(false);
    expect(isDayKey("")).toBe(false);
    expect(shiftDay("2026-10-30", 3)).toBe("2026-11-02");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("school week", () => {
  it("runs from Monday to Friday around any weekday", () => {
    expect(schoolWeekOf("2026-10-26")).toEqual({ start: "2026-10-26", end: "2026-10-30" }); // Monday
    expect(schoolWeekOf("2026-10-29")).toEqual({ start: "2026-10-26", end: "2026-10-30" }); // Thursday
    expect(schoolWeekOf("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-10-30" }); // Sunday
  });

  it("formats labels in Indonesian", () => {
    expect(formatDayKey("2026-10-29")).toBe("Kamis, 29 Oktober 2026");
    expect(formatSchoolWeek("2026-10-29")).toBe("Sen, 26 Okt – Jum, 30 Okt 2026");
  });
});

describe("filtering activities by date", () => {
  const week = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"].flatMap((day) => [
    at(`${day}T02:00:00Z`, `${day} pagi`),
    at(`${day}T06:00:00Z`, `${day} siang`),
  ]);
  const items = [
    at("2026-10-23T03:00:00Z", "previous friday"),
    ...week,
    at("2026-10-31T03:00:00Z", "saturday"),
    at("2026-11-02T03:00:00Z", "next monday"),
    { title: "undated", date: "Tanggal belum tersedia", occurredAt: undefined },
  ];

  it("keeps everything when no date is selected", () => {
    expect(filterActivitiesByDate(items, { mode: "all" })).toHaveLength(items.length);
  });

  it("returns the activities of one day", () => {
    const result = filterActivitiesByDate(items, { mode: "day", date: "2026-10-28" });
    expect(result.map((item) => item.title)).toEqual(["2026-10-28 pagi", "2026-10-28 siang"]);
  });

  it("returns the ten activities of a week with two per day, Monday to Friday", () => {
    const result = filterActivitiesByDate(items, { mode: "week", date: "2026-10-28" });
    expect(result).toHaveLength(10);
    expect(result.map((item) => item.title)).toEqual(week.map((item) => item.title));
  });

  it("leaves undated activities out of a day or week selection", () => {
    expect(filterActivitiesByDate(items, { mode: "week", date: "2026-10-28" }).some((item) => item.title === "undated")).toBe(false);
  });
});

describe("calendar month grid", () => {
  it("covers October 2026 in Monday-to-Sunday rows", () => {
    const weeks = calendarWeeks("2026-10-20");
    expect(weeks[0][0]).toBe("2026-09-28"); // 1 Oct 2026 is a Thursday
    expect(weeks[0][3]).toBe("2026-10-01");
    expect(weeks.at(-1)?.at(-1)).toBe("2026-11-01"); // 31 Oct is a Saturday
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("shifts months and keeps the first day", () => {
    expect(shiftMonth("2026-10-20", 1)).toBe("2026-11-01");
    expect(shiftMonth("2026-01-15", -1)).toBe("2025-12-01");
    expect(monthKeyOf("2026-10-20")).toBe("2026-10");
  });

  it("labels and classifies days", () => {
    expect(formatMonth("2026-10-20")).toBe("Oktober 2026");
    expect(dayOfMonth("2026-10-05")).toBe(5);
    expect(isWeekend("2026-10-17")).toBe(true); // Saturday
    expect(isWeekend("2026-10-20")).toBe(false);
  });
});
