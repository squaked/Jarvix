"use client";

import { cn } from "@/lib/utils";
import { RecentConversations } from "./RecentConversations";

const TRY_ASKING = [
  "What's on my calendar today?",
  "What's the weather like?",
  "Add a calendar event for tomorrow at 3pm",
  "Search the web for latest AI news",
  "Summarize my week from the calendar",
] as const;

const CAPABILITIES = [
  "Calendar",
  "Weather",
  "Web search",
  "Memory",
  "Tools in chat",
] as const;

type Props = {
  /** Starts a new chat with this message (prefill + navigate). */
  onQuickStart: (message: string) => void | Promise<void>;
  starting?: boolean;
};

export function DashboardBottomSection({ onQuickStart, starting }: Props) {
  return (
    <div className="w-full mt-auto pt-10 border-t border-border/40 space-y-10">
      <section className="w-full animate-fade-up stagger-5" aria-labelledby="dash-try-label">
        <p
          id="dash-try-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 px-1"
        >
          Try asking
        </p>
        <div className="flex flex-wrap gap-2">
          {TRY_ASKING.map((q) => (
            <button
              key={q}
              type="button"
              disabled={starting}
              onClick={() => void onQuickStart(q)}
              className={cn(
                "max-w-full text-left rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text transition-all",
                "hover:border-accent/40 hover:bg-surface-2 hover:shadow-soft",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <span className="line-clamp-2">{q}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="w-full" aria-labelledby="dash-features-label">
        <p
          id="dash-features-label"
          className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 px-1"
        >
          What Jarvix can do
        </p>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((label) => (
            <span
              key={label}
              className="inline-flex items-center rounded-lg border border-border/80 bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <RecentConversations />
    </div>
  );
}
