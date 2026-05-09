"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  JARVIX_UPDATE_BUILD_IDLE_EVENT,
  JARVIX_UPDATE_BUILD_STARTED_EVENT,
  clearJarvixUpdateFastPollWindow,
  jarvixUpdateFastPollRemainingMs,
} from "@/lib/jarvix-update-poll";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "ready" | "restarting" | "waiting";

const POLL_SLOW_MS = 15_000;
const POLL_FAST_MS = 3_500;
const RESTART_GRACE_MS = 90_000; // give the server up to 90s to come back
const RESTART_POLL_MS = 1_500;

/** Avoid silent failures when AbortSignal.timeout is missing (some WebKit builds). */
function fetchTimeoutSignal(ms: number): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

export function UpdateBanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const checkForUpdate = useCallback(async () => {
    // Don't perturb the UI mid-restart with a stray status check.
    if (phaseRef.current !== "idle") return;
    try {
      const res = await fetch("/api/update-status", {
        cache: "no-store",
        signal: fetchTimeoutSignal(3000),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ready?: boolean };
      if (data.ready) {
        clearJarvixUpdateFastPollWindow();
        setPhase("ready");
      }
    } catch {
      // network unavailable — try again on the next tick
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const reinstallTimer = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      const useFast = jarvixUpdateFastPollRemainingMs() > 0;
      const ms = useFast ? POLL_FAST_MS : POLL_SLOW_MS;
      intervalId = setInterval(() => void checkForUpdate(), ms);
    };

    const bump = () => {
      void checkForUpdate();
      reinstallTimer();
    };

    void checkForUpdate();
    reinstallTimer();

    window.addEventListener(JARVIX_UPDATE_BUILD_STARTED_EVENT, bump);
    window.addEventListener(JARVIX_UPDATE_BUILD_IDLE_EVENT, reinstallTimer);

    // Re-check immediately when the user returns to the tab so a long-idle
    // session doesn't have to wait a full interval to surface a new update.
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId);
      window.removeEventListener(JARVIX_UPDATE_BUILD_STARTED_EVENT, bump);
      window.removeEventListener(JARVIX_UPDATE_BUILD_IDLE_EVENT, reinstallTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdate]);

  const handleRestart = useCallback(async () => {
    setPhase("restarting");
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch {
      // expected — the server closes the connection while restarting
    }

    setPhase("waiting");

    // Poll until the new server is back, then reload. Bail out after the
    // grace window and surface "ready" again so the user can retry.
    const startedAt = Date.now();
    const poll = () => {
      fetch("/api/update-status", {
        cache: "no-store",
        signal: fetchTimeoutSignal(2000),
      })
        .then((r) => {
          if (r.ok) {
            window.location.reload();
            return;
          }
          throw new Error("not ok");
        })
        .catch(() => {
          if (Date.now() - startedAt > RESTART_GRACE_MS) {
            setPhase("ready");
            return;
          }
          setTimeout(poll, RESTART_POLL_MS);
        });
    };
    setTimeout(poll, 2500);
  }, []);

  const visible = phase === "ready" || phase === "restarting" || phase === "waiting";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
          style={{ boxShadow: "var(--warm-shadow), 0 4px 24px rgba(0,0,0,0.12)" }}
          role="status"
        >
          {phase === "ready" && (
            <>
              <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
              <span className="text-text font-medium">Update ready</span>
              <button
                onClick={handleRestart}
                className="ml-1 rounded-xl border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent transition-all hover:bg-accent/20 hover:border-accent/50"
              >
                Restart to apply
              </button>
            </>
          )}
          {(phase === "restarting" || phase === "waiting") && (
            <>
              <Spinner />
              <span className="text-muted">
                {phase === "restarting" ? "Restarting…" : "Waiting for server…"}
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-muted shrink-0"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
