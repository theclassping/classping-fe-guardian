type VisibilitySource = Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;

type PollOptions = {
  /** Gap between calls while the tab is on screen. */
  visibleMs: number;
  /** Gap between calls while the tab is in the background. Leave out to make no calls there. */
  hiddenMs?: number;
  doc?: VisibilitySource;
  now?: () => number;
};

/**
 * Calls `tick` on a timer that follows tab visibility, so background tabs stop
 * spending server time. Coming back to the tab calls `tick` at once when a
 * visible-rate call is overdue; quick tab switches do not add calls.
 * Returns a function that stops the polling.
 */
export function pollWhileVisible(tick: () => void, { visibleMs, hiddenMs, doc = document, now = Date.now }: PollOptions) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = now();

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const gap = doc.visibilityState === "visible" ? visibleMs : hiddenMs;
    if (gap === undefined) return;
    timer = setTimeout(() => {
      last = now();
      tick();
      schedule();
    }, Math.max(0, gap - (now() - last)));
  };

  schedule();
  doc.addEventListener("visibilitychange", schedule);
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    doc.removeEventListener("visibilitychange", schedule);
  };
}
