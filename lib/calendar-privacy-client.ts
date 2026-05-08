/**
 * Browser-side helpers for System Settings → Privacy & Security → Calendars.
 * Keep deep-link URLs aligned with {@link lib/mac-open-calendars-privacy.ts}.
 *
 * The reliable path is POST /api/open-calendars-privacy (runs `open` on the Mac).
 * Deep links are a fallback when the API call fails (e.g. remote UI without the server).
 */

/** Same order as `CALENDARS_PRIVACY_URLS` in `mac-open-calendars-privacy.ts`. */
export const CALENDAR_PRIVACY_DEEP_LINKS = [
  "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Calendars",
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars",
] as const;

export function userAgentLooksLikeMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac OS X|Macintosh|MacIntel|MacPPC|Mac68K/i.test(navigator.userAgent);
}

/** Best-effort: may not open Settings from all browsers — prefer {@link fetchOpenCalendarsPrivacy}. */
export function openCalendarPrivacyDeepLinkFromBrowser(preferenceIndex = 0): void {
  if (typeof window === "undefined") return;
  const url = CALENDAR_PRIVACY_DEEP_LINKS[preferenceIndex];
  if (!url) return;
  window.location.assign(url);
}

export function fetchOpenCalendarsPrivacy(): Promise<Response> {
  return fetch("/api/open-calendars-privacy", { method: "POST" });
}

/**
 * Primary UX for “open Calendars privacy”: ask the local Next server to run `open`.
 * Falls back to a Settings deep link only on macOS-like UAs when the fetch fails.
 */
export async function runCalendarPrivacyButtonAction(): Promise<void> {
  try {
    const res = await fetchOpenCalendarsPrivacy();
    if (res.ok) return;
  } catch {
    /* fall through */
  }
  if (userAgentLooksLikeMacDesktop()) {
    openCalendarPrivacyDeepLinkFromBrowser(0);
  }
}
