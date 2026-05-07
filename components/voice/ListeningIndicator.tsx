"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** Pulsing red dot — universal “recording / listening” affordance. */
export function ListeningPulseDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative flex h-2.5 w-2.5 shrink-0", className)}
      aria-hidden
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
    </span>
  );
}

export function VoiceLevelMeter({
  level,
  className,
}: {
  /** 0–1 RMS-ish level from the analyser */
  level: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(6, Math.round(level * 100)));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-border/50",
        className,
      )}
      aria-hidden
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-red-400 to-rose-400"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      />
    </div>
  );
}
