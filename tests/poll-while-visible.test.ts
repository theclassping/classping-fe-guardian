import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollWhileVisible } from "@/lib/pollWhileVisible";

function fakeTab() {
  const listeners = new Set<() => void>();
  return {
    visibilityState: "visible" as DocumentVisibilityState,
    addEventListener: (_type: string, listener: unknown) => { listeners.add(listener as () => void); },
    removeEventListener: (_type: string, listener: unknown) => { listeners.delete(listener as () => void); },
    show(state: DocumentVisibilityState) { this.visibilityState = state; for (const listener of listeners) listener(); },
    listeners,
  };
}

describe("notification polling follows tab visibility", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("waits one interval, then polls while the tab is visible", () => {
    const doc = fakeTab();
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, { visibleMs: 120_000, doc: doc as unknown as Document });
    vi.advanceTimersByTime(119_000);
    expect(tick).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(121_000);
    expect(tick).toHaveBeenCalledTimes(2);
    stop();
  });

  it("makes no calls while hidden and catches up once on return", () => {
    const doc = fakeTab();
    const tick = vi.fn();
    const stop = pollWhileVisible(tick, { visibleMs: 120_000, doc: doc as unknown as Document });
    doc.show("hidden");
    vi.advanceTimersByTime(3_600_000);
    expect(tick).toHaveBeenCalledTimes(0);
    doc.show("visible");
    vi.advanceTimersByTime(0);
    expect(tick).toHaveBeenCalledTimes(1);
    // A quick switch away and back must not add a call.
    doc.show("hidden");
    doc.show("visible");
    vi.advanceTimersByTime(0);
    expect(tick).toHaveBeenCalledTimes(1);
    stop();
    vi.advanceTimersByTime(3_600_000);
    expect(tick).toHaveBeenCalledTimes(1);
    expect(doc.listeners.size).toBe(0);
  });
});
