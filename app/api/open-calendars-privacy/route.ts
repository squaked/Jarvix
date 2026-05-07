import { openCalendarsPrivacySettings } from "@/lib/mac-open-calendars-privacy";
import {
  requestCalendarAccessAttempt,
  type CalendarAccessAttemptResult,
} from "@/lib/tool-runners/eventkit";

export const runtime = "nodejs";

const ACCESS_RACE_MS = 18_000;

const CALENDAR_ACCESS_TIMEOUT: CalendarAccessAttemptResult = {
  eventkitAvailable: false,
  accessGranted: false,
  status: "timeout",
  jarvixHelperReady: false,
};

/**
 * Opens System Settings → Calendars first (so the user sees feedback even if
 * EventKit blocks), then best-effort triggers a permission prompt on the Jarvix
 * server (localhost Mac only — hosted APIs cannot reach your Calendar).
 */
export async function POST() {
  const privacy = await openCalendarsPrivacySettings();

  let calendarAccess: CalendarAccessAttemptResult;
  try {
    calendarAccess = await Promise.race([
      requestCalendarAccessAttempt(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), ACCESS_RACE_MS);
      }),
    ]);
  } catch {
    calendarAccess = CALENDAR_ACCESS_TIMEOUT;
  }

  return Response.json({
    ...privacy,
    calendarAccess,
  });
}
