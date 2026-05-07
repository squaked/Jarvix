"use client";

/**
 * Opens System Settings → Privacy & Security → Calendars.
 * Keep URLs aligned with `lib/mac-open-calendars-privacy.ts`.
 */
export const CALENDAR_PRIVACY_DEEP_LINKS = [
  "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Calendars",
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars",
] as const;

export function userAgentLooksLikeMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  const plat = navigator.platform ?? "";
  return /^Mac/i.test(plat) && !(/iPhone|iPad|iPod/i.test(ua));
}

/**
 * Hosted Jarvix (Netlify etc.) runs the API off your Mac — only the browser
 * can open local System Settings via a clicked deep link (user gesture).
 */
export function openCalendarPrivacyDeepLinkFromBrowser(): boolean {
  if (typeof document === "undefined") return false;
  if (!userAgentLooksLikeMacDesktop()) return false;

  try {
    const href = CALENDAR_PRIVACY_DEEP_LINKS[0];
    const a = document.createElement("a");
    a.href = href;
    a.rel = "noreferrer noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}

export type OpenCalendarsPrivacyResponse = {
  ok: boolean;
  error?: string;
  calendarAccess?: {
    eventkitAvailable: boolean;
    accessGranted: boolean;
    status: string;
    jarvixHelperReady: boolean;
  };
};

export async function fetchOpenCalendarsPrivacy(): Promise<OpenCalendarsPrivacyResponse> {
  try {
    const res = await fetch("/api/open-calendars-privacy", { method: "POST" });
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return {
        ok: false,
        error: !res.ok ? `Server error (${res.status})` : "Invalid server response.",
      };
    }
    const obj = parsed as Record<string, unknown>;
    const serverSaysOk = obj.ok === true;
    const mergedOk = res.ok && serverSaysOk;
    const err = typeof obj.error === "string" ? obj.error : undefined;
    const calendarAccess =
      obj.calendarAccess as OpenCalendarsPrivacyResponse["calendarAccess"];

    if (!res.ok) {
      return {
        ok: false,
        error: err ?? `Request failed (${res.status})`,
        calendarAccess,
      };
    }

    return {
      ok: mergedOk,
      ...(!mergedOk ? { error: err ?? "Server could not open System Settings." } : {}),
      ...(calendarAccess ? { calendarAccess } : {}),
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Could not reach Jarvix (network/offline).",
    };
  }
}

/** Click handler: browser deep link (hosted-safe) + API (localhost Mac server). */
export async function runCalendarPrivacyButtonAction(): Promise<{
  deepLinkAttempted: boolean;
  api: OpenCalendarsPrivacyResponse;
}> {
  const deepLinkAttempted = openCalendarPrivacyDeepLinkFromBrowser();
  const api = await fetchOpenCalendarsPrivacy();
  return { deepLinkAttempted, api };
}
