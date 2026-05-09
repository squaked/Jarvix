"use client";

import type { CalendarReadResult } from "@/lib/tool-runners/eventkit";

/** Reuse data when GreetingBlock mounts after settings bootstrap (CalendarWidget already fetched). */
const STALE_MS = 45_000;

let inflight: Promise<CalendarReadResult> | null = null;
let last: { t: number; data: CalendarReadResult } | null = null;

/**
 * Dedupes overlapping calls and serves a brief cache so CalendarWidget +
 * GreetingBlock (effects often run staggered) still share one network + server read.
 */
export function fetchCalendarWidgetData(): Promise<CalendarReadResult> {
  if (last && Date.now() - last.t < STALE_MS) {
    return Promise.resolve(last.data);
  }

  if (!inflight) {
    inflight = fetch("/api/widgets/calendar", {
      cache: "no-store",
      priority: "high",
    })
      .then(async (res): Promise<CalendarReadResult> => {
        if (!res.ok) return { events: [], accessGranted: false };
        return (await res.json()) as CalendarReadResult;
      })
      .then((data) => {
        last = { t: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
