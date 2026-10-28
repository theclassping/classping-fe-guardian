export const VERIFICATION_POLL_INTERVAL_MS = 20_000;

type VisibilityTarget = {
  readonly hidden: boolean;
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
};

export type VerificationPollingOptions = {
  /** Re-reads the bill from the server (router.refresh in the portal). */
  refresh: () => void;
  intervalMs?: number;
  /** Defaults to `document`; injectable for tests. */
  target?: VisibilityTarget;
};

/**
 * Refreshes the bill while it awaits school verification.
 *
 * - Sends nothing while the tab is hidden.
 * - Refreshes once immediately when the tab becomes visible again, then
 *   resumes the regular interval.
 * - Stops entirely once the returned function is called (the component
 *   unmounts as soon as the server renders a verified or rejected bill).
 */
export function startVerificationPolling({
  refresh,
  intervalMs = VERIFICATION_POLL_INTERVAL_MS,
  target = document,
}: VerificationPollingOptions) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const schedule = () => {
    clear();
    if (stopped || target.hidden) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (stopped || target.hidden) return;
      refresh();
      schedule();
    }, intervalMs);
  };

  const onVisibilityChange = () => {
    if (stopped) return;
    if (target.hidden) {
      clear();
      return;
    }
    refresh();
    schedule();
  };

  target.addEventListener("visibilitychange", onVisibilityChange);
  schedule();

  return () => {
    stopped = true;
    clear();
    target.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
