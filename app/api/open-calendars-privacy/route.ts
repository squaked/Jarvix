import { openCalendarsPrivacySettings } from "@/lib/mac-open-calendars-privacy";
import { requestCalendarAccessAttempt } from "@/lib/tool-runners/eventkit";

export const runtime = "nodejs";

/**
 * Triggers Calendar access (Jarvix helper or EventKit in Node), then opens
 * System Settings → Privacy & Security → Calendars (macOS only).
 */
export async function POST() {
  const calendarAccess = await requestCalendarAccessAttempt();
  const privacy = await openCalendarsPrivacySettings();
  return Response.json({
    ...privacy,
    calendarAccess,
  });
}
