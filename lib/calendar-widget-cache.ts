"use client";

import type { CalendarReadResult } from "@/lib/tool-runners/eventkit";

/** Client-only: dashboard calendar widget caches results in localStorage for instant loading. */
export const CALENDAR_WIDGET_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const STORAGE_KEY = "jarvix_calendar_widget_cache_v1";

type Stored = {
  v: 1;
  fetchedAt: number;
  data: CalendarReadResult;
};

export function readCalendarWidgetCache(): CalendarReadResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== 1) return null;
    
    // If cache is very old (>10m), we ignore it. 
    // We still allow slightly stale data to show while we re-fetch in the background.
    if (Date.now() - s.fetchedAt > CALENDAR_WIDGET_CACHE_TTL_MS) return null;
    
    return s.data;
  } catch {
    return null;
  }
}

export function writeCalendarWidgetCache(data: CalendarReadResult) {
  if (typeof window === "undefined") return;
  const s: Stored = {
    v: 1,
    fetchedAt: Date.now(),
    data,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
