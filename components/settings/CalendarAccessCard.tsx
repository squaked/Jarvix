"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  runCalendarPrivacyButtonAction,
  userAgentLooksLikeMacDesktop,
} from "@/lib/calendar-privacy-client";
import { useState } from "react";

export function CalendarAccessCard() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const openPrivacy = async () => {
    setBusy(true);
    setNote(null);
    try {
      const { deepLinkAttempted, api } = await runCalendarPrivacyButtonAction();
      const bits: string[] = [];

      if (deepLinkAttempted) {
        bits.push(
          "Launched the macOS Calendars privacy pane from your browser. If System Settings did not appear, open System Settings → Privacy & Security → Calendars manually.",
        );
      } else if (userAgentLooksLikeMacDesktop()) {
        bits.push(
          "This browser did not open the Settings link — open System Settings → Privacy & Security → Calendars yourself.",
        );
      } else {
        bits.push(
          "On a phone or PC, Jarvix cannot open Mac privacy settings. Calendar tools need the Jarvix server running on a Mac (for example `next dev` on your machine).",
        );
      }

      if (api.ok) {
        bits.push(
          "The Jarvix server also ran the macOS shortcut (expected when Jarvix runs on this Mac via localhost).",
        );
      } else if (api.error) {
        bits.push(
          userAgentLooksLikeMacDesktop() && deepLinkAttempted
            ? `Server note (safe to ignore when using a hosted URL on a Mac): ${api.error}`
            : api.error,
        );
      }

      if (api.calendarAccess?.jarvixHelperReady === false) {
        bits.push(
          "If “Jarvix” is not listed under Calendars, enable access for the program that runs the server — often Terminal, Cursor, Chrome (if it launched Node), or `node`.",
        );
      }

      if (api.calendarAccess?.status === "timeout") {
        bits.push(
          "Permission warmup timed out; you can still toggle Calendars access in System Settings.",
        );
      }

      setNote(bits.join("\n\n"));
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
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Opens macOS Privacy → Calendars. Use this on a Mac desktop browser; hosted Jarvix
          opens Settings via your browser, while API access only works when the server runs on
          the same Mac.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => void openPrivacy()}
      >
        {busy ? "Working…" : "Open Privacy Settings"}
      </Button>

      {note ? (
        <p className="whitespace-pre-line text-sm text-muted leading-relaxed">{note}</p>
      ) : null}
    </Card>
  );
}
