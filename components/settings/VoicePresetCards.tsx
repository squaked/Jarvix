"use client";

import { AGENT_VOICE_OPTIONS } from "@/lib/agent-personalization";
import type { AgentVoicePreset } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: AgentVoicePreset;
  onChange: (next: AgentVoicePreset) => void;
  disabled?: boolean;
};

/** Concise, human, and concrete — what the user can actually expect to hear. */
const VOICE_TASTE: Record<AgentVoicePreset, { headline: string; example: string }> = {
  balanced: {
    headline: "A friendly co-pilot.",
    example: "“Sure — I’ll grab the answer and keep it short.”",
  },
  warm: {
    headline: "Encouraging and patient.",
    example: "“Of course! Let’s walk through it together.”",
  },
  professional: {
    headline: "Polished and neutral.",
    example: "“Understood. I’ll handle that and report back.”",
  },
  custom: {
    headline: "Write your own.",
    example: "Describe how Jarvix should sound in your own words.",
  },
};

export function VoicePresetCards({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Voice & personality"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {AGENT_VOICE_OPTIONS.map((opt) => {
        const taste = VOICE_TASTE[opt.id];
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              "group flex flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition-all",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? "border-accent bg-accent/[0.07] shadow-[0_0_0_3px_var(--accent-soft)]"
                : "border-border bg-surface hover:border-accent/40 hover:bg-surface-2",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-medium text-text">{opt.label}</span>
              <span
                aria-hidden
                className={cn(
                  "h-3.5 w-3.5 rounded-full border transition-all",
                  selected ? "border-accent bg-accent" : "border-border",
                )}
              />
            </div>
            <p className="text-xs leading-snug text-muted">{taste.headline}</p>
            <p className="text-[11px] italic leading-snug text-muted/80 line-clamp-2">
              {taste.example}
            </p>
          </button>
        );
      })}
    </div>
  );
}
