import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVerificationPolling, VERIFICATION_POLL_INTERVAL_MS } from "@/lib/verificationPolling";

function fakeDocument(hidden = false) {
  const listeners = new Set<() => void>();
  return {
    hidden,
    addEventListener: (_: "visibilitychange", listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_: "visibilitychange", listener: () => void) => { listeners.delete(listener); },
    setHidden(value: boolean) {
      this.hidden = value;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

describe("payment verification polling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refreshes on every interval while the tab is visible", () => {
    const refresh = vi.fn();
    const target = fakeDocument();
    startVerificationPolling({ refresh, target });

    vi.advanceTimersByTime(VERIFICATION_POLL_INTERVAL_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(VERIFICATION_POLL_INTERVAL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("sends nothing while the tab is hidden", () => {
    const refresh = vi.fn();
    const target = fakeDocument(true);
    startVerificationPolling({ refresh, target });

    vi.advanceTimersByTime(VERIFICATION_POLL_INTERVAL_MS * 5);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("pauses when the tab is hidden and catches up once it is visible again", () => {
    const refresh = vi.fn();
    const target = fakeDocument();
    startVerificationPolling({ refresh, target, intervalMs: 1000 });

    vi.advanceTimersByTime(500);
    target.setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(refresh).not.toHaveBeenCalled();

    target.setHidden(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops polling and removes its listener when the status box unmounts", () => {
    const refresh = vi.fn();
    const target = fakeDocument();
    const stop = startVerificationPolling({ refresh, target, intervalMs: 1000 });

    stop();
    vi.advanceTimersByTime(5000);
    target.setHidden(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(target.listenerCount()).toBe(0);
  });
});
