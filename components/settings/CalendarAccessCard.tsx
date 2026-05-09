"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";

type Status =
  | { state: "checking" }
  | { state: "granted" }
  | { state: "not-granted"; status: string }
  | { state: "unavailable" };

export function CalendarAccessCard() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "checking" });

  const check = async () => {
    try {
      const res = await fetch("/api/calendar-access", { cache: "no-store" });
      if (!res.ok) {
        setStatus({ state: "unavailable" });
        return;
      }
      const data = (await res.json()) as { granted?: boolean; status?: string };
      if (data.granted) {
        setStatus({ state: "granted" });
      } else {
        setStatus({
          state: "not-granted",
          status: data.status || "not granted",
        });
      }
    } catch {
      setStatus({ state: "unavailable" });
    }
  };

  useEffect(() => {
    void check();
    // Re-check when the user comes back from System Settings.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const openPrivacy = async () => {
    setBusy(true);
    try {
      await fetch("/api/open-calendars-privacy", { method: "POST" });
      // The system prompt may have flipped permission already.
      await check();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Calendar
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Lets Jarvix answer questions about your schedule. Calendar data stays
          on your Mac.
        </p>
      </div>

      <StatusBadge status={status} />

      <Button
        type="button"
        variant={status.state === "granted" ? "ghost" : "secondary"}
        disabled={busy || status.state === "granted"}
        onClick={() => void openPrivacy()}
      >
        {busy
          ? "Opening Privacy Settings…"
          : status.state === "granted"
            ? "✓ Calendar connected"
            : "Open Privacy Settings"}
      </Button>
    </Card>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status.state === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted" />
        Checking permissions…
      </div>
    );
  }
  if (status.state === "granted") {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
          background: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
        Calendar access granted
      </div>
    );
  }
  if (status.state === "unavailable") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-muted/60" />
        Calendar status unavailable on this system.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Not granted yet — open Privacy Settings to allow.
    </div>
  );
}
