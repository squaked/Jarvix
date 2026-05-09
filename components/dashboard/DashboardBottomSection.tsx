"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { RecentConversations } from "./RecentConversations";

type Suggestion = { label: string; prompt: string; tag: string };

const SUGGESTION_POOL: readonly Suggestion[] = [
  { tag: "Calendar", label: "What's on today?",            prompt: "What's on my calendar today?" },
  { tag: "Calendar", label: "Summarize my week",           prompt: "Give me a quick summary of my week from the calendar." },
  { tag: "Calendar", label: "Schedule something",          prompt: "Add a calendar event for tomorrow at 3pm called " },
  { tag: "Weather",  label: "Weather check",               prompt: "What's the weather like today?" },
  { tag: "Weather",  label: "Should I bring a jacket?",    prompt: "Is it going to be cold today? Should I dress warmly?" },
  { tag: "Web",      label: "Search the web",              prompt: "Search the web for the latest news about " },
  { tag: "Write",    label: "Draft a quick message",       prompt: "Help me draft a short, friendly message to " },
  { tag: "Plan",     label: "Plan my day",                 prompt: "Look at my calendar and weather, then suggest a plan for my day." },
];

function pickSuggestions(): Suggestion[] {
  // Stable per page-load (so the layout doesn't shuffle during interaction)
  // but varied across reloads so it doesn't feel static.
  const pool = [...SUGGESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a !== undefined && b !== undefined) {
      pool[i] = b;
      pool[j] = a;
    }
  }
  return pool.slice(0, 4);
}

type Props = {
  /** Starts a new chat with this message (prefill + navigate). */
  onQuickStart: (message: string) => void | Promise<void>;
  starting?: boolean;
};

export function DashboardBottomSection({ onQuickStart, starting }: Props) {
  // Suggestions are computed once per mount.
  const [suggestions] = useState(() => pickSuggestions());

  return (
    <div className="w-full mt-auto pt-10 border-t border-border/40 space-y-10">
      <section className="w-full animate-fade-up stagger-5" aria-labelledby="dash-try-label">
        <p
          id="dash-try-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 px-1"
        >
          Try asking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <button
              key={s.prompt}
              type="button"
              disabled={starting}
              onClick={() => void onQuickStart(s.prompt)}
              className={cn(
                "group flex flex-col items-start gap-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-all",
                "hover:border-accent/40 hover:bg-surface-2 hover:shadow-soft",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                {s.tag}
              </span>
              <span className="line-clamp-2 text-sm text-text">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      <RecentConversations />
    </div>
  );
}
