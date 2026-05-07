"use client";

import { useJarvixSettings } from "@/lib/settings";
import { useEffect, useState } from "react";

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

export function GreetingBlock() {
  const { settings } = useJarvixSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const name = settings.agent?.displayName?.trim();

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
    </div>
  );
}
