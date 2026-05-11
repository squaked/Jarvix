"use client";

import { Card } from "@/components/ui/Card";
import { jarvixDisplayVersion } from "@/lib/jarvix-version-display";
import {
  kickJarvixUpdateBannerStatus,
  clearJarvixUpdateFastPollWindow,
  startJarvixUpdateFastPollWindow,
} from "@/lib/jarvix-update-poll";
import { useEffect, useState } from "react";

type Status =
  | "idle"
  | "checking"
  | "upToDate"
  | "building"
  | "ready"
  | "error";

type CheckResponse = {
  upToDate?: boolean;
  building?: boolean;
  ready?: boolean;
  alreadyRunning?: boolean;
  error?: string;
};

export function CheckUpdatesSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const displayVersion = jarvixDisplayVersion();

  const check = async () => {
    setStatus("checking");
    // Survives navigation away from Settings while the POST / spawn runs.
    startJarvixUpdateFastPollWindow();
    setErrorMsg("");
    try {
      const res = await fetch("/api/check-updates", {
        method: "POST",
        keepalive: true,
      });
      const data = (await res.json().catch(() => ({}))) as CheckResponse;
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }
      if (data.ready) {
        // Keep fast polling; tell the banner to read status immediately.
        kickJarvixUpdateBannerStatus();
        setStatus("ready");
      } else if (data.upToDate) {
        clearJarvixUpdateFastPollWindow();
        setStatus("upToDate");
        setTimeout(() => setStatus((s) => (s === "upToDate" ? "idle" : s)), 4000);
      } else {
        // building / alreadyRunning — keep fast polling until `.update-ready` appears
        setStatus("building");
      }
    } catch (e) {
      clearJarvixUpdateFastPollWindow();
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status !== "building") return;

    const interval = setInterval(() => {
      fetch("/api/update-status", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { ready?: boolean; building?: boolean }) => {
          if (data.ready) {
            kickJarvixUpdateBannerStatus();
            setStatus("ready");
          } else if (!data.building) {
            // Lock disappeared but no ready marker — pull or build failed; see update.log.
            clearJarvixUpdateFastPollWindow();
            setErrorMsg(
              "Update did not finish (git sync or build failed). See logs/update.log in your Jarvix install folder.",
            );
            setStatus("error");
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [status]);

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
          {displayVersion ? (
            <p
              className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted/90"
              title="Package version and git commit for this build"
            >
              {displayVersion}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">
            {status === "idle" && "Jarvix checks automatically every 6 hours."}
            {status === "checking" && "Checking for updates…"}
            {status === "upToDate" && "Already up to date."}
            {status === "building" && "Update found — building in the background. A banner will appear when ready."}
            {status === "ready" && "Update built and waiting — use the banner to restart."}
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
          ) : status === "ready" ? (
            <>
              <CheckIcon />
              Update ready
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
