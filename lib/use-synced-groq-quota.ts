"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroqTranscriptionUsage } from "./transcribe-api-types";
import {
  GROQ_QUOTA_STORAGE_KEY,
  GROQ_QUOTA_UPDATED_EVENT,
  readGroqQuotaFromSession,
} from "./groq-quota-global";

/**
 * Groq rate-limit snapshot from sessionStorage (written when chat / transcribe
 * responses include x-ratelimit-* headers). Re-reads on custom event, storage,
 * and when the tab becomes visible—no inferred “live” usage.
 */
export function useSyncedGroqQuota() {
  const [quota, setQuota] = useState<GroqTranscriptionUsage | null>(null);

  const sync = useCallback(() => {
    setQuota(readGroqQuotaFromSession());
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onEvent = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === GROQ_QUOTA_STORAGE_KEY) sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener(GROQ_QUOTA_UPDATED_EVENT, onEvent);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(GROQ_QUOTA_UPDATED_EVENT, onEvent);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  return { quota, syncQuota: sync };
}
