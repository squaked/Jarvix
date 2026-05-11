"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  JARVIX_UPDATE_BANNER_KICK_EVENT,
  JARVIX_UPDATE_BUILD_IDLE_EVENT,
  JARVIX_UPDATE_BUILD_STARTED_EVENT,
  clearJarvixUpdateFastPollWindow,
  jarvixUpdateFastPollRemainingMs,
} from "@/lib/jarvix-update-poll";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mountedRef = useRef(true);
  /** Set synchronously on "Restart to apply" before React re-renders. POST /api/restart deletes `.update-ready` immediately, so the next poll would otherwise see `ready: false` and dismiss the banner while phaseRef is still "ready". */
  const restartFlowRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (restartFlowRef.current) {
      return;
    }
    // Mid-restart: wait for restart flow — don't flicker banner state.
    if (
      phaseRef.current === "restarting" ||
      phaseRef.current === "waiting"
    ) {
      return;
    }

    try {
      const res = await fetch("/api/update-status", {
        cache: "no-store",
        signal: fetchTimeoutSignal(5000),
      });
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const data = (await res.json()) as { ready?: boolean };
      if (!mountedRef.current) return;

      if (data.ready === true) {
        clearJarvixUpdateFastPollWindow();
        setPhase("ready");
        return;
      }

      // Dismiss stale "Update ready" without killing fast polls while idle/building.
      if (phaseRef.current === "ready") {
        clearJarvixUpdateFastPollWindow();
        setPhase("idle");
      }
    } catch {
      // network unavailable — try again on the next tick
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const reinstallTimer = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      const useFast = jarvixUpdateFastPollRemainingMs() > 0;
      const ms = useFast ? POLL_FAST_MS : POLL_SLOW_MS;
      intervalId = setInterval(() => void checkForUpdate(), ms);
      void checkForUpdate();
    };

    const bump = () => {
      void checkForUpdate();
      reinstallTimer();
    };

    void checkForUpdate();
    reinstallTimer();

    window.addEventListener(JARVIX_UPDATE_BUILD_STARTED_EVENT, bump);
    window.addEventListener(JARVIX_UPDATE_BUILD_IDLE_EVENT, reinstallTimer);

    const onKick = () => void checkForUpdate();
    window.addEventListener(JARVIX_UPDATE_BANNER_KICK_EVENT, onKick);

    // Re-check immediately when the user returns to the tab so a long-idle
    // session doesn't have to wait a full interval to surface a new update.
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      if (intervalId !== undefined) clearInterval(intervalId);
      window.removeEventListener(JARVIX_UPDATE_BUILD_STARTED_EVENT, bump);
      window.removeEventListener(JARVIX_UPDATE_BUILD_IDLE_EVENT, reinstallTimer);
      window.removeEventListener(JARVIX_UPDATE_BANNER_KICK_EVENT, onKick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdate]);

  /** Any in-app navigation re-checks promptly (e.g. left Settings while a build finished). */
  useEffect(() => {
    void checkForUpdate();
  }, [pathname, checkForUpdate]);

  // Once "restarting" / "waiting" has committed, polls can use phaseRef again.
  useLayoutEffect(() => {
    if (phase === "restarting" || phase === "waiting") {
      restartFlowRef.current = false;
    }
  }, [phase]);

  const handleRestart = useCallback(async () => {
    restartFlowRef.current = true;
    setPhase("restarting");
    try {
      const res = await fetch("/api/restart", { method: "POST" });
      // If the relauncher failed to spawn, the server stays alive and returns
      // a 500 with an error message. Show "ready" again so the user can retry.
      if (!res.ok) {
        restartFlowRef.current = false;
        setPhase("ready");
        return;
      }
    } catch {
      // expected — the server closes the connection while restarting
    }

    setPhase("waiting");

    // Poll until the new server is back, then reload. Bail out after the
    // grace window and surface "ready" again so the user can retry.
    const startedAt = Date.now();
    const poll = () => {
      if (!mountedRef.current) return;
      fetch("/api/update-status", {
        cache: "no-store",
        signal: fetchTimeoutSignal(2000),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("not ok");
          const body = (await r.json().catch(() => ({}))) as {
            ready?: boolean;
          };
          // Only reload once enough time has passed that the OLD server has
          // definitely exited (it waits 2s before process.exit). This avoids
          // reloading against the stale server that already cleared the marker.
          if (body.ready !== true && Date.now() - startedAt > 5000) {
            window.location.reload();
            return;
          }
          throw new Error("still pending");
        })
        .catch(() => {
          if (Date.now() - startedAt > RESTART_GRACE_MS) {
            if (mountedRef.current) {
              restartFlowRef.current = false;
              setPhase("ready");
            }
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
          key="update-banner"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
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
