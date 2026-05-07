import {
  ensureEventKitHelperBuilt,
  helperAuthStatus,
  helperEventsInRange,
  helperRequestAccess,
  helperSaveEvent,
  isEventKitHelperInstalled,
} from "@/lib/eventkit-helper-client";

export type CalendarEventBrief = {
  title: string;
  start: string;
  end: string;
  calendar: string;
};

export type CalendarReadResult = {
  events: CalendarEventBrief[];
  /** Guidance when empty or sourced from fallback (for assistant + troubleshooting). */
  hint?: string;
  /**
   * True when EventKit accepted the read (including empty calendars).
   * Helps the model distinguish “no events today” from “permission denied”.
   */
  accessGranted?: boolean;
};

function serializeEvent(ev: import("eventkit-node").Event): CalendarEventBrief {
  return {
    title: ev.title,
    start: ev.startDate.toISOString(),
    end: ev.endDate.toISOString(),
    calendar: ev.calendarTitle,
  };
}

async function loadEventKit() {
  try {
    return await import("eventkit-node");
  } catch {
    return null;
  }
}

function safeAuthEvent(ek: NonNullable<Awaited<ReturnType<typeof loadEventKit>>>) {
  try {
    return String(ek.getAuthorizationStatus("event"));
  } catch {
    return "unknown";
  }
}

/** macOS 14+ uses fullAccess; older SDKs used authorized. Callback may return false while status is already allowed. */
function calendarReadAllowed(status: string): boolean {
  return status === "fullAccess" || status === "authorized";
}

function calendarWriteAllowed(status: string): boolean {
  return calendarReadAllowed(status) || status === "writeOnly";
}

type LoadedEK = NonNullable<Awaited<ReturnType<typeof loadEventKit>>>;

async function ensureCalendarReadAccess(ek: LoadedEK): Promise<boolean> {
  if (calendarReadAllowed(safeAuthEvent(ek))) return true;
  const callbackOk = await ek.requestFullAccessToEvents().catch(() => false);
  return callbackOk || calendarReadAllowed(safeAuthEvent(ek));
}

async function ensureCalendarWriteAccess(ek: LoadedEK): Promise<boolean> {
  if (calendarWriteAllowed(safeAuthEvent(ek))) return true;
  const callbackOk = await ek.requestFullAccessToEvents().catch(() => false);
  return callbackOk || calendarWriteAllowed(safeAuthEvent(ek));
}

/**
 * Prefer the small Jarvix helper app when present so macOS Privacy shows “Jarvix” correctly.
 * Builds the helper once on macOS if it’s missing (needs Xcode Command Line Tools).
 */
async function eventKitHelperUsable(): Promise<boolean> {
  if (process.env.JARVIX_EVENTKIT_HELPER === "0") return false;
  await ensureEventKitHelperBuilt();
  return isEventKitHelperInstalled();
}

const calendarPermissionHint =
  "On your Mac: System Settings → Privacy & Security → Calendars. Turn on Jarvix if it’s listed, or the program that runs your Jarvix server (often Cursor, Terminal, or Node)—the chat is in the browser, but permission is for that Mac program.";

async function appleScriptFallbackForToday(explain: string): Promise<CalendarReadResult> {
  const { calendarEventsTodayAppleScript } = await import(
    "./calendar-applescript"
  );
  const events = await calendarEventsTodayAppleScript();
  if (events.length > 0) {
    return {
      events,
      hint: `${explain} Some events may still appear using Apple Calendar.`,
    };
  }
  return {
    events: [],
    hint: `${explain} ${calendarPermissionHint} Then try again.`,
  };
}

export async function getCalendarEventsTodayWithHint(): Promise<CalendarReadResult> {
  if (await eventKitHelperUsable()) {
    try {
      await helperRequestAccess();
      const status = await helperAuthStatus();
      if (!calendarReadAllowed(status)) {
        return appleScriptFallbackForToday(
          `Calendar access isn’t allowed yet (${status}).`,
        );
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const events = await helperEventsInRange(start, end);
      return { events, accessGranted: true };
    } catch {
      /* fall through to eventkit-node / AppleScript */
    }
  }

  const ek = await loadEventKit();

  if (!ek) {
    return appleScriptFallbackForToday(
      "Native EventKit module did not load (wrong OS/architecture or addon missing).",
    );
  }

  const before = safeAuthEvent(ek);
  const canRead = await ensureCalendarReadAccess(ek);
  const after = safeAuthEvent(ek);

  if (!canRead) {
    return appleScriptFallbackForToday(
      `EventKit calendar read not available (${before} → ${after}).`,
    );
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const pred = ek.createEventPredicate(start, end);
  const raw = ek.getEventsWithPredicate(pred);
  const events = raw.map(serializeEvent);

  return { events, accessGranted: true };
}

/** @deprecated Prefer getCalendarEventsTodayWithHint for diagnostics */
export async function getCalendarEventsToday(): Promise<CalendarEventBrief[]> {
  const r = await getCalendarEventsTodayWithHint();
  return r.events;
}

export async function getCalendarEventsRangeWithHint(
  startInput: Date,
  endInput: Date,
): Promise<CalendarReadResult> {
  if (
    Number.isNaN(startInput.getTime()) ||
    Number.isNaN(endInput.getTime())
  ) {
    return {
      events: [],
      hint: "Invalid ISO start or end date (unparseable).",
    };
  }

  let rangeStart = startInput;
  let rangeEnd = endInput;
  if (rangeEnd < rangeStart) {
    const t = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = t;
  }

  if (await eventKitHelperUsable()) {
    try {
      await helperRequestAccess();
      const status = await helperAuthStatus();
      if (!calendarReadAllowed(status)) {
        return {
          events: [],
          hint: `Calendar access isn’t allowed yet (${status}). ${calendarPermissionHint}`,
        };
      }
      const events = await helperEventsInRange(rangeStart, rangeEnd);
      return { events, accessGranted: true };
    } catch {
      /* fall through */
    }
  }

  const ek = await loadEventKit();
  if (!ek) {
    return {
      events: [],
      hint: `${calendarPermissionHint} Date-range reads need EventKit; module failed to load.`,
    };
  }

  const canRead = await ensureCalendarReadAccess(ek);
  if (!canRead) {
    const status = safeAuthEvent(ek);
    return {
      events: [],
      hint: `EventKit range read denied (${status}). ${calendarPermissionHint}`,
    };
  }

  const pred = ek.createEventPredicate(rangeStart, rangeEnd);
  const events = ek.getEventsWithPredicate(pred).map(serializeEvent);
  return { events, accessGranted: true };
}

export async function getCalendarEventsRange(
  startInput: Date,
  endInput: Date,
): Promise<CalendarEventBrief[]> {
  const r = await getCalendarEventsRangeWithHint(startInput, endInput);
  return r.events;
}

export async function calendarCreateEvent(input: {
  title: string;
  startISO: string;
  endISO: string;
  notes?: string;
}): Promise<{ id: string }> {
  if (await eventKitHelperUsable()) {
    try {
      await helperRequestAccess();
      const status = await helperAuthStatus();
      if (!calendarWriteAllowed(status)) {
        throw new Error(`Calendar access denied (${status}).`);
      }
      const startDate = new Date(input.startISO);
      const endDate = new Date(input.endISO);
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        throw new Error("Invalid start or end ISO date.");
      }
      if (endDate.getTime() < startDate.getTime()) {
        throw new Error("End time must be on or after start time.");
      }
      return await helperSaveEvent({
        title: input.title,
        startISO: input.startISO,
        endISO: input.endISO,
        notes: input.notes,
      });
    } catch {
      /* fall through to eventkit-node */
    }
  }

  const ek = await loadEventKit();
  if (!ek) throw new Error("eventkit unavailable");
  const ok = await ensureCalendarWriteAccess(ek);
  if (!ok) throw new Error("Calendar access denied");

  const defaultCal = ek.getDefaultCalendarForNewEvents();
  if (!defaultCal?.id) throw new Error("No default calendar.");

  const startDate = new Date(input.startISO);
  const endDate = new Date(input.endISO);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new Error("Invalid start or end ISO date.");
  }
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("End time must be on or after start time.");
  }

  const id = await ek.saveEvent(
    {
      title: input.title,
      notes: input.notes,
      startDate,
      endDate,
      calendarId: defaultCal.id,
    },
    "thisEvent",
    true,
  );

  return { id };
}

/**
 * Ask macOS for calendar access before opening Privacy settings.
 */
export async function requestCalendarAccessAttempt(): Promise<{
  eventkitAvailable: boolean;
  accessGranted: boolean;
  status: string;
  /** True when the Jarvix helper app exists — that’s what shows up as “Jarvix” in Privacy. */
  jarvixHelperReady: boolean;
}> {
  if (await eventKitHelperUsable()) {
    try {
      const { granted, status } = await helperRequestAccess();
      return {
        eventkitAvailable: true,
        accessGranted: granted,
        status,
        jarvixHelperReady: true,
      };
    } catch {
      /* fall through */
    }
  }
  const helperReady = isEventKitHelperInstalled();
  const ek = await loadEventKit();
  if (!ek) {
    return {
      eventkitAvailable: false,
      accessGranted: false,
      status: "eventkit unavailable",
      jarvixHelperReady: helperReady,
    };
  }
  const accessGranted = await ensureCalendarReadAccess(ek);
  return {
    eventkitAvailable: true,
    accessGranted,
    status: safeAuthEvent(ek),
    jarvixHelperReady: helperReady,
  };
}
