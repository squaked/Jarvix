/** While set, UpdateBanner polls `/api/update-status` frequently (see UpdateBanner). */
export const JARVIX_UPDATE_FAST_POLL_UNTIL_KEY = "jarvix-update-fast-poll-until";

export const JARVIX_UPDATE_BUILD_STARTED_EVENT = "jarvix-update-build-started";
export const JARVIX_UPDATE_BUILD_IDLE_EVENT = "jarvix-update-build-idle";

/** Default: keep checking often for 45m after user hits “Check for updates” (build can take a while). */
const DEFAULT_FAST_POLL_WINDOW_MS = 45 * 60 * 1000;

export function startJarvixUpdateFastPollWindow(
  durationMs: number = DEFAULT_FAST_POLL_WINDOW_MS,
): void {
  try {
    const until = Date.now() + durationMs;
    sessionStorage.setItem(JARVIX_UPDATE_FAST_POLL_UNTIL_KEY, String(until));
    window.dispatchEvent(new CustomEvent(JARVIX_UPDATE_BUILD_STARTED_EVENT));
  } catch {
    /* sessionStorage unavailable (private mode) — UpdateBanner still uses slow poll */
  }
}

export function clearJarvixUpdateFastPollWindow(): void {
  try {
    sessionStorage.removeItem(JARVIX_UPDATE_FAST_POLL_UNTIL_KEY);
    window.dispatchEvent(new CustomEvent(JARVIX_UPDATE_BUILD_IDLE_EVENT));
  } catch {
    /* noop */
  }
}

/** Remaining fast-poll budget in ms (0 if none). Safe on server — returns 0. */
export function jarvixUpdateFastPollRemainingMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(JARVIX_UPDATE_FAST_POLL_UNTIL_KEY);
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}
