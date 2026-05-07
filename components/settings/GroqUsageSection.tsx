"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useJarvixSettings } from "@/lib/settings";
import {
  formatGroqResetRounded,
  groqQuotaLinesFromUsage,
  groqQuotaLinesSortedForDisplay,
  quotaLineRemainingPercent,
} from "@/lib/groq-transcription-quota";
import { useGroqQuotaLiveRefresh } from "@/lib/use-groq-quota-live-refresh";
import { useSyncedGroqQuota } from "@/lib/use-synced-groq-quota";
import { cn } from "@/lib/utils";

function barTone(pct: number) {
  if (pct > 50) return "bg-emerald-400/70";
  if (pct > 20) return "bg-accent/80";
  return "bg-red-400/75";
}

export function GroqUsageSection() {
  const { settings, bootstrapped } = useJarvixSettings();
  const { quota, syncQuota } = useSyncedGroqQuota();
  const { refreshFromGroq, refreshing } = useGroqQuotaLiveRefresh(
    quota,
    settings,
    bootstrapped,
  );

  const lines = groqQuotaLinesSortedForDisplay(groqQuotaLinesFromUsage(quota));

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <h2
        className="font-display text-lg font-medium text-text"
        style={{ fontVariationSettings: '"opsz" 20' }}
      >
        Usage
      </h2>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3 text-sm text-muted">
          Use chat or voice once, then return here or tap Refresh.
        </p>
      ) : (
        <ul className="space-y-6">
          {lines.map((line) => {
            const pct = quotaLineRemainingPercent(line);
            const reset = line.reset?.trim();
            return (
              <li key={line.key} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-text">{line.shortLabel}</span>
                  <span className="tabular-nums text-sm text-muted">
                    {line.remaining.toLocaleString()} / {line.limit.toLocaleString()} · {pct}%
                    left
                  </span>
                </div>
                <div
                  className="relative h-2.5 w-full overflow-hidden rounded-full bg-border/50"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${line.shortLabel}: ${pct} percent left`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300",
                      barTone(pct),
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {reset ? (
                  <p className="text-xs text-muted">
                    Resets in{" "}
                    <span className="tabular-nums text-text/80">
                      {formatGroqResetRounded(reset)}
                    </span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={refreshing}
          onClick={() => {
            void refreshFromGroq({ force: true }).then(() => syncQuota());
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </Card>
  );
}
