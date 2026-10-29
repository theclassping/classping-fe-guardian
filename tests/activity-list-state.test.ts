import { describe, expect, it } from "vitest";
import { ACTIVITY_PAGE_SIZE, applyActivityListState, dateFilterOf, parseActivityListState } from "@/lib/activityListState";

const today = "2026-10-29";

describe("activity list state in the URL", () => {
  it("defaults to every activity, today, and one page", () => {
    expect(parseActivityListState(new URLSearchParams(), today)).toEqual({ mode: "all", date: today, shown: ACTIVITY_PAGE_SIZE, query: "" });
  });

  it("restores a week selection with extra cards loaded and a search", () => {
    const params = new URLSearchParams("mode=week&date=2026-10-26&shown=18&q=balok");
    expect(parseActivityListState(params, today)).toEqual({ mode: "week", date: "2026-10-26", shown: 18, query: "balok" });
  });

  it("ignores malformed values", () => {
    const params = new URLSearchParams("mode=month&date=26-10-2026&shown=abc");
    expect(parseActivityListState(params, today)).toEqual({ mode: "all", date: today, shown: ACTIVITY_PAGE_SIZE, query: "" });
    expect(parseActivityListState(new URLSearchParams("shown=2"), today).shown).toBe(ACTIVITY_PAGE_SIZE);
  });

  it("writes only non-default values and keeps the student param", () => {
    const written = applyActivityListState(new URLSearchParams("student_id=7"), { mode: "day", date: "2026-10-27", shown: 12, query: "" });
    expect(written.toString()).toBe("student_id=7&mode=day&date=2026-10-27&shown=12");
    const cleared = applyActivityListState(written, { mode: "all", date: "2026-10-27", shown: ACTIVITY_PAGE_SIZE, query: "" });
    expect(cleared.toString()).toBe("student_id=7");
  });

  it("drops the date once no date mode is active", () => {
    expect(dateFilterOf({ mode: "all", date: today })).toEqual({ mode: "all" });
    expect(dateFilterOf({ mode: "week", date: today })).toEqual({ mode: "week", date: today });
  });
});
