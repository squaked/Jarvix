import type { GroqTranscriptionUsage } from "./transcribe-api-types";
import { isGroqUsagePayloadEmpty } from "./groq-usage-from-headers";
export const GROQ_QUOTA_STORAGE_KEY = "jarvix-groq-quota-global";

const LEGACY_CHAT_KEY = "jarvix-groq-chat-quota";

export const GROQ_QUOTA_UPDATED_EVENT = "jarvix:groq-quota-updated";

/** Overlay new header fields onto the last snapshot so TPM and RPD rows stay in sync across chat vs voice. */
export function mergeGroqQuota(
  prev: GroqTranscriptionUsage | null,
  next: GroqTranscriptionUsage,
): GroqTranscriptionUsage {
  if (!prev) return { ...next };
  const out: GroqTranscriptionUsage = { ...prev };
  const assign = <K extends keyof GroqTranscriptionUsage>(key: K) => {
    const v = next[key];
    if (v !== undefined && v !== null && v !== "") {
      out[key] = v;
    }
  };
  assign("retryAfterSeconds");
  assign("limitRequests");
  assign("remainingRequests");
  assign("resetRequests");
  assign("limitTokens");
  assign("remainingTokens");
  assign("resetTokens");
  return out;
}

export function readGroqQuotaFromSession(): GroqTranscriptionUsage | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = sessionStorage.getItem(GROQ_QUOTA_STORAGE_KEY);
    if (!raw) {
      const legacy = sessionStorage.getItem(LEGACY_CHAT_KEY);
      if (legacy) {
        sessionStorage.setItem(GROQ_QUOTA_STORAGE_KEY, legacy);
        sessionStorage.removeItem(LEGACY_CHAT_KEY);
        raw = legacy;
      }
    }
    if (!raw) return null;
    const p = JSON.parse(raw) as GroqTranscriptionUsage;
    return isGroqUsagePayloadEmpty(p) ? null : p;
  } catch {
    return null;
  }
}

/** Persist and notify listeners (same tab + optional storage sync elsewhere). */
export function writeGroqQuotaToSession(u: GroqTranscriptionUsage): void {
  if (typeof window === "undefined") return;
  if (isGroqUsagePayloadEmpty(u)) return;
  try {
    let prev: GroqTranscriptionUsage | null = null;
    const raw = sessionStorage.getItem(GROQ_QUOTA_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as GroqTranscriptionUsage;
        prev = isGroqUsagePayloadEmpty(parsed) ? null : parsed;
      } catch {
        prev = null;
      }
    }
    const merged = mergeGroqQuota(prev, u);
    merged.snapshotAtMs = Date.now();
    sessionStorage.setItem(GROQ_QUOTA_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(GROQ_QUOTA_UPDATED_EVENT));
  } catch {
    /* quota / private mode */
  }
}
