"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function CalendarAccessCard() {
  const [busy, setBusy] = useState(false);

  const openPrivacy = async () => {
    setBusy(true);
    try {
      await fetch("/api/open-calendars-privacy", { method: "POST" });
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
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => void openPrivacy()}
      >
        {busy ? "Preparing…" : "Open Privacy Settings"}
      </Button>
    </Card>
  );
}
