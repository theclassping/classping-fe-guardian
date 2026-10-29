import { isDayKey, todayKey, type ActivityDateFilter, type DayKey } from "@/lib/activityFilter";

export const ACTIVITY_PAGE_SIZE = 6;

export type ActivityListState = {
  mode: ActivityDateFilter["mode"];
  date: DayKey;
  /** How many cards are shown before the "load more" button. */
  shown: number;
  query: string;
};

type ParamsLike = { get(name: string): string | null };

/** Reads the list state from the page URL; anything missing or malformed falls back to the default. */
export function parseActivityListState(params: ParamsLike, today: DayKey = todayKey()): ActivityListState {
  const mode = params.get("mode");
  const date = params.get("date");
  const shown = Number(params.get("shown"));
  return {
    mode: mode === "day" || mode === "week" ? mode : "all",
    date: isDayKey(date) ? date : today,
    shown: Number.isInteger(shown) && shown > ACTIVITY_PAGE_SIZE ? shown : ACTIVITY_PAGE_SIZE,
    query: params.get("q")?.trim() ?? "",
  };
}

/**
 * Writes the list state back into the URL's search params, leaving unrelated
 * params (student_id, child) untouched and dropping anything at its default.
 */
export function applyActivityListState(params: URLSearchParams, state: ActivityListState): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (name: string, value: string | null) => (value ? next.set(name, value) : next.delete(name));
  set("mode", state.mode === "all" ? null : state.mode);
  set("date", state.mode === "all" ? null : state.date);
  set("shown", state.shown > ACTIVITY_PAGE_SIZE ? String(state.shown) : null);
  set("q", state.query || null);
  return next;
}

export function dateFilterOf(state: Pick<ActivityListState, "mode" | "date">): ActivityDateFilter {
  return state.mode === "all" ? { mode: "all" } : { mode: state.mode, date: state.date };
}
