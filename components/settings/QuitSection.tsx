"use client";

import { Card } from "@/components/ui/Card";
import { useState } from "react";

export function QuitSection() {
  const [quitting, setQuitting] = useState(false);
  const [quit, setQuit] = useState(false);

  const handleQuit = async () => {
    setQuitting(true);
    try {
      await fetch("/api/quit", { method: "POST" });
    } catch {
      // expected — server closes the connection as it exits
    }
    setQuit(true);
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className="font-display text-lg font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 20' }}
          >
            Quit Jarvix
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {quit
              ? "Jarvix has stopped. To reopen, click Jarvix in your Dock or Applications folder."
              : "Stops the app."}
          </p>
        </div>

        {!quit && (
          <button
            type="button"
            disabled={quitting}
            onClick={() => void handleQuit()}
            className="shrink-0 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-all hover:border-red-400/40 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--warm-shadow)" }}
          >
            {quitting ? "Quitting…" : "Quit"}
          </button>
        )}
      </div>
    </Card>
  );
}
