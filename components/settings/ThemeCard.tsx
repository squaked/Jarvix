"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

export function ThemeCard() {
  // next-themes is client-only; avoid hydration flicker.
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "system" : "system";

  return (
    <Card className="space-y-4 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Appearance
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Choose how Jarvix looks on this Mac.
        </p>
      </div>

      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const selected = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                selected
                  ? "border-accent bg-accent/[0.07] text-accent shadow-[0_0_0_3px_var(--accent-soft)]"
                  : "border-border bg-surface text-text hover:border-accent/40 hover:bg-surface-2",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
