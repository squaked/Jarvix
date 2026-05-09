"use client";

import {
  appHeaderIconButtonClass,
  appHeaderIconButtonClassCompact,
} from "@/components/layout/AppHeader";
import { useJarvixSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type Props = {
  /** Match chat vs dashboard header sizing. */
  compact?: boolean;
  className?: string;
};

/**
 * One-tap mute/unmute for read-aloud (persists via settings).
 */
export function TtsHeaderToggle({ compact, className }: Props) {
  const { settings, saveSettings } = useJarvixSettings();
  const enabled = settings.tts.enabled;

  const iconBtn = compact
    ? appHeaderIconButtonClassCompact
    : appHeaderIconButtonClass;

  const toggle = () => {
    void saveSettings({
      tts: { ...settings.tts, enabled: !enabled },
    }).catch(() => {
      /* offline / save failed */
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(iconBtn, className)}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn off read aloud" : "Turn on read aloud"}
      title={
        enabled
          ? "Read aloud on — tap to mute"
          : "Read aloud off — tap to enable"
      }
      style={{ boxShadow: "var(--warm-shadow)" } as CSSProperties}
    >
      {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
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
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
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
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
