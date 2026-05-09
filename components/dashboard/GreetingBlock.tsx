"use client";

import { useJarvixSettings } from "@/lib/settings";
import { useEffect, useState } from "react";

type CalEvent = { title: string; start: string; end: string };

type WeatherSnap = { temp_c: number; description: string };

type Snapshot = {
  nextEvent?: { title: string; startISO: string; nowOngoing: boolean };
  weather?: WeatherSnap;
  eventCount?: number;
};

function getGreeting(hour: number): string {
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function formatDate(now: Date): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(now: Date): string {
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function GreetingBlock() {
  const { settings, bootstrapped } = useJarvixSettings();
  const [now, setNow] = useState(() => new Date());
  const [snap, setSnap] = useState<Snapshot>({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Lightweight calendar + weather peek for the at-a-glance line.
  // Failures are silent — we just don't render the preview.
  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/widgets/calendar");
        if (!res.ok) return;
        const data = (await res.json()) as { events?: CalEvent[] };
        if (cancelled) return;
        const events = (data.events ?? []).sort(
          (a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        );
        const nowMs = Date.now();
        const upcoming = events.find((e) => new Date(e.end).getTime() > nowMs);
        setSnap((s) => ({
          ...s,
          eventCount: events.length,
          nextEvent: upcoming
            ? {
                title: upcoming.title,
                startISO: upcoming.start,
                nowOngoing: new Date(upcoming.start).getTime() <= nowMs,
              }
            : undefined,
        }));
      } catch {
        /* no preview, no problem */
      }
    })();

    void (async () => {
      try {
        const loc = settings.weatherLocation.trim();
        if (!loc) return;
        const res = await fetch(
          `/api/widgets/weather?city=${encodeURIComponent(loc)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as WeatherSnap;
        if (cancelled) return;
        if (typeof json.temp_c === "number") {
          setSnap((s) => ({ ...s, weather: json }));
        }
      } catch {
        /* skip */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, settings.weatherLocation]);

  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const name = settings.agent?.displayName?.trim();

  const previewBits: string[] = [];
  if (snap.nextEvent) {
    if (snap.nextEvent.nowOngoing) {
      previewBits.push(`Now: ${snap.nextEvent.title}`);
    } else {
      previewBits.push(
        `Next: ${snap.nextEvent.title} at ${formatEventTime(snap.nextEvent.startISO)}`,
      );
    }
  } else if (typeof snap.eventCount === "number" && snap.eventCount === 0) {
    previewBits.push("Nothing on your calendar");
  }
  if (snap.weather) {
    previewBits.push(`${Math.round(snap.weather.temp_c)}° · ${snap.weather.description}`);
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-sm font-medium text-muted animate-fade-up stagger-1">
        {formatDate(now)} · {formatTime(now)}
      </p>
      <h1
        className="font-display text-[2.6rem] leading-tight font-medium text-text animate-fade-up stagger-2"
        style={{ fontOpticalSizing: "auto", fontVariationSettings: '"opsz" 48' }}
      >
        {greeting}
        {name ? (
          <span className="italic" style={{ color: "var(--accent)" }}>
            , {name}
          </span>
        ) : null}
      </h1>
      {previewBits.length > 0 && (
        <p className="mt-1 text-sm text-muted/80 animate-fade-up stagger-3">
          {previewBits.join(" · ")}
        </p>
      )}
    </div>
  );
}
