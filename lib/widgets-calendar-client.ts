"use client";

import type { CalendarReadResult } from "@/lib/tool-runners/eventkit";
import { readCalendarWidgetCache, writeCalendarWidgetCache } from "./calendar-widget-cache";

/** Memory stale time - brief deduping. */
const STALE_MS = 30_000;

let inflight: Promise<CalendarReadResult> | null = null;
let last: { t: number; data: CalendarReadResult } | null = null;

/**
 * Dedupes overlapping calls and serves a brief cache.
 * Uses localStorage to provide instant loading on app start.
 */
export async function fetchCalendarWidgetData(): Promise<CalendarReadResult> {
  // 1. Check memory cache
  if (last && Date.now() - last.t < STALE_MS) {
    return last.data;
  }

  // 2. Check persistent cache (only if not already fetching)
  if (!inflight) {
    const cached = readCalendarWidgetCache();
    if (cached) {
      // Return cached data immediately, but still start a background refresh
      // if it's older than our memory STALE_MS.
      void startFetch();
      return cached;
    }
  }

  return startFetch();
}

function startFetch(): Promise<CalendarReadResult> {
  if (inflight) return inflight;

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
      writeCalendarWidgetCache(data);
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
