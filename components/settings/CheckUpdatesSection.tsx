"use client";

import { Card } from "@/components/ui/Card";
import { useState } from "react";

type Status = "idle" | "checking" | "upToDate" | "building" | "error";

export function CheckUpdatesSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const check = async () => {
    setStatus("checking");
    setErrorMsg("");
    try {
      const res = await fetch("/api/check-updates", { method: "POST" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = (await res.json()) as { upToDate?: boolean; error?: string };
      if (data.error) throw new Error(data.error);
      if (data.upToDate) {
        setStatus("upToDate");
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        // update.sh is now running in the background; banner appears when ready
        setStatus("building");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-lg font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 20' }}
          >
            Updates
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {status === "idle" && "Jarvix checks automatically every 30 minutes."}
            {status === "checking" && "Checking for updates…"}
            {status === "upToDate" && "Already up to date."}
            {status === "building" && "Update found — building in the background. A banner will appear when ready."}
            {status === "error" && (errorMsg || "Check failed.")}
          </p>
        </div>

        <button
          type="button"
          disabled={status === "checking" || status === "building"}
          onClick={() => void check()}
          className="shrink-0 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-all hover:border-accent/40 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: "var(--warm-shadow)" }}
        >
          {status === "checking" ? (
            <>
              <Spinner />
              Checking…
            </>
          ) : status === "upToDate" ? (
            <>
              <CheckIcon />
              Up to date
            </>
          ) : status === "building" ? (
            <>
              <Spinner />
              Building…
            </>
          ) : (
            "Check for updates"
          )}
        </button>
      </div>
    </Card>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
