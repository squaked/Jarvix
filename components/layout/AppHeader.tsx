"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";

const appHeaderIconButtonBase =
  "flex items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-text hover:border-accent/40 transition-all";

export const appHeaderIconButtonClass = cn(appHeaderIconButtonBase, "h-9 w-9");

/** Matches the settings control when `AppHeader` is used with `compact`. */
export const appHeaderIconButtonClassCompact = cn(
  appHeaderIconButtonBase,
  "h-8 w-8",
);

type Props = {
  /** Shown before the Settings control (e.g. History). */
  endBeforeSettings?: ReactNode;
  className?: string;
  /** Tighter paddings and controls (e.g. chat). */
  compact?: boolean;
};

export function AppHeader({ endBeforeSettings, className, compact }: Props) {
  const iconBtn = compact ? appHeaderIconButtonClassCompact : appHeaderIconButtonClass;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <header
      className={cn(
        "flex items-center justify-between shrink-0 animate-fade-in",
        compact ? "px-4 pt-2 pb-1.5" : "px-6 pt-6 pb-2",
        className,
      )}
    >
      <Link
        href="/"
        className="flex flex-col items-start gap-0.5 group"
      >
        <div className="relative h-8 w-8 rounded-xl overflow-hidden border border-border/50 shadow-soft transition-transform group-hover:scale-105">
          <Image src="/icon.png" alt="Jarvix" fill className="object-cover" />
        </div>
        {!compact && (
          <span className="text-[10px] font-medium text-muted/80 whitespace-nowrap uppercase tracking-wider">
            {dateStr} · {timeStr}
          </span>
        )}
      </Link>

      <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
        {endBeforeSettings}
        <Link
          href="/settings"
          className={iconBtn}
          aria-label="Settings"
          style={{ boxShadow: "var(--warm-shadow)" }}
        >
          <SettingsGlyph />
        </Link>
      </div>
    </header>
  );
}

function SettingsGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
