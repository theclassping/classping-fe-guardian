"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const MAX_IDS = 200;
const listeners = new Set<() => void>();
/** Used when localStorage is unavailable (private mode, blocked storage), so ids still last for this page session. */
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function parseIds(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * A list of ids kept in localStorage under `key` (e.g. notifications the parent has read).
 * Renders with an empty list on the server, then the stored list in the browser.
 */
export function useStoredIds(key: string): [string[], (ids: readonly string[]) => void] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  const ids = useMemo(() => parseIds(raw), [raw]);

  const add = useCallback((newIds: readonly string[]) => {
    const next = JSON.stringify([...new Set([...parseIds(readRaw(key)), ...newIds])].slice(-MAX_IDS));
    memory.set(key, next);
    try { localStorage.setItem(key, next); } catch { /* kept in memory for this session */ }
    listeners.forEach((listener) => listener());
  }, [key]);

  return [ids, add];
}
