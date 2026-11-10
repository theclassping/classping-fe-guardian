/**
 * List items from a backend list response, whichever shape it uses:
 * a plain array, DRF pagination (`{ results: [...] }`) or `{ data: [...] }`.
 * Anything else yields an empty list.
 */
export function records<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const { results, data } = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(results)) return results as T[];
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

/** An API id as a positive integer, or undefined. */
export function positiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** Like `records`, but `null` when the payload is not a list response at all (e.g. the request failed). */
export function recordsOrNull<T>(payload: unknown): T[] | null {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return null;
}
