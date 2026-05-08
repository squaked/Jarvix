"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

type Phase = "idle" | "ready" | "restarting" | "waiting";

export function UpdateBanner() {
  const [phase, setPhase] = useState<Phase>("idle");

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch("/api/update-status");
      if (res.ok) {
        const data = (await res.json()) as { ready: boolean };
        if (data.ready) setPhase((p) => (p === "idle" ? "ready" : p));
      }
    } catch {
      // network unavailable — ignore
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
    const id = setInterval(checkForUpdate, 60_000);
    return () => clearInterval(id);
  }, [checkForUpdate]);

  const handleRestart = useCallback(async () => {
    setPhase("restarting");
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch {
      // expected — server closes the connection while restarting
    }

    setPhase("waiting");

    // Poll until the server is back up, then reload.
    const poll = () => {
      fetch("/api/update-status", { signal: AbortSignal.timeout(2000) })
        .then((r) => {
          if (r.ok) window.location.reload();
          else setTimeout(poll, 1000);
        })
        .catch(() => setTimeout(poll, 1000));
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
