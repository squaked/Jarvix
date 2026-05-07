"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  title: string;
  start: string;
  end: string;
  calendar: string;
};

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "no-access" }
  | { status: "done"; events: CalendarEvent[] };

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isNowBetween(start: string, end: string): boolean {
  const now = Date.now();
  return now >= new Date(start).getTime() && now <= new Date(end).getTime();
}

export function CalendarWidget() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/widgets/calendar");
        const data = (await res.json()) as {
          events?: CalendarEvent[];
          accessGranted?: boolean;
          hint?: string;
        };

        if (!data.accessGranted && (!data.events || data.events.length === 0)) {
          setState({ status: "no-access" });
          return;
        }

        const events = (data.events ?? []).sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        );

        if (events.length === 0) {
          setState({ status: "empty" });
        } else {
          setState({ status: "done", events });
        }
      } catch {
        setState({ status: "no-access" });
      }
    })();
  }, []);

  return (
    <div className="widget-card animate-fade-up stagger-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Today
        </span>
      </div>

      {state.status === "loading" && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="shimmer h-10 rounded-xl" />
          ))}
        </div>
      )}

      {state.status === "empty" && (
        <div className="py-2">
          <p className="font-display text-xl text-text" style={{ fontVariationSettings: '"opsz" 24' }}>
            A clear day
          </p>
          <p className="text-sm text-muted mt-0.5">Nothing scheduled</p>
        </div>
      )}

      {state.status === "no-access" && (
        <div className="py-2">
          <p className="text-sm text-muted">
            Open Jarvix Settings and allow calendar access to see your day here.
          </p>
        </div>
      )}

      {state.status === "done" && (
        <ul className="space-y-2.5">
          {state.events.slice(0, 4).map((ev, i) => {
            const active = isNowBetween(ev.start, ev.end);
            return (
              <li
                key={i}
                className="flex items-start gap-3 group"
              >
                <div
                  className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                  style={{
                    background: active ? "var(--accent)" : "var(--border)",
                    boxShadow: active ? "0 0 6px var(--accent-glow)" : "none",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate leading-snug">
                    {ev.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatEventTime(ev.start)} – {formatEventTime(ev.end)}
                  </p>
                </div>
                {active && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                    }}
                  >
                    Now
                  </span>
                )}
              </li>
            );
          })}
          {state.events.length > 4 && (
            <p className="text-xs text-muted pl-4">
              +{state.events.length - 4} more
            </p>
          )}
        </ul>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
