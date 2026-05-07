"use client";

import { fetchGroqQuotaRefresh } from "@/lib/groq-quota-refresh-client";
import { writeGroqQuotaToSession } from "@/lib/groq-quota-global";
import { nextGroqQuotaRefreshAtMs } from "@/lib/groq-transcription-quota";
import { isGroqUsagePayloadEmpty } from "@/lib/groq-usage-from-headers";
import { hasActiveApiKey } from "@/lib/settings-credentials";
import type { GroqTranscriptionUsage } from "@/lib/transcribe-api-types";
import type { Settings } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const THROTTLE_MS = 5000;

/**
 * Re-fetch rate limits from Groq when reset windows elapse (scheduled from
 * `snapshotAtMs` + Groq’s reset durations). Manual refresh bypasses throttle via `force`.
 */
export function useGroqQuotaLiveRefresh(
  quota: GroqTranscriptionUsage | null,
  settings: Settings,
  bootstrapped: boolean,
) {
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);
  const lastPingRef = useRef(0);
  const didSeedRef = useRef(false);

  const refreshFromGroq = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!bootstrapped || !hasActiveApiKey(settings)) return;
      const now = Date.now();
      if (!opts?.force && now - lastPingRef.current < THROTTLE_MS) return;
      if (busyRef.current) return;
      busyRef.current = true;
      lastPingRef.current = now;
      setRefreshing(true);
      try {
        const u = await fetchGroqQuotaRefresh(settings);
        if (u && !isGroqUsagePayloadEmpty(u)) {
          writeGroqQuotaToSession(u);
        }
      } finally {
        busyRef.current = false;
        setRefreshing(false);
      }
    },
    [bootstrapped, settings],
  );

  useEffect(() => {
    if (!bootstrapped || !hasActiveApiKey(settings)) return;
    if (!quota || quota.snapshotAtMs != null) return;
    if (isGroqUsagePayloadEmpty(quota)) return;
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    void refreshFromGroq({ force: true });
  }, [bootstrapped, quota, refreshFromGroq, settings]);

  useEffect(() => {
    if (!bootstrapped || !hasActiveApiKey(settings)) return;
    const nextAt = nextGroqQuotaRefreshAtMs(quota);
    if (nextAt == null) return;

    const skew = nextAt - Date.now();
    const delay =
      skew > 0 ? Math.min(Math.max(100, skew + 150), 2147483647) : 30_000;

    const id = window.setTimeout(() => {
      void refreshFromGroq();
    }, delay);
    return () => window.clearTimeout(id);
  }, [bootstrapped, quota, refreshFromGroq, settings]);

  return { refreshFromGroq, refreshing };
}
