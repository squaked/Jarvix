import type { GroqTranscriptionUsage } from "./transcribe-api-types";

/** Derived from Groq `x-ratelimit-*` headers only — nothing inferred beyond that. */
export type GroqQuotaLine = {
  key: "requests" | "tokens";
  shortLabel: string;
  remaining: number;
  limit: number;
  used: number;
  /** Raw header value, e.g. `7.66s` (TPM) or `2m59.56s` (RPD). */
  reset?: string;
};

/** Parses Groq reset strings (`7.66s`, `2m59.56s`, optional `1h`) into seconds. */
export function parseGroqResetDurationSeconds(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }
  let total = 0;
  let matched = false;
  const h = t.match(/(\d+)h/);
  const m = t.match(/(\d+)m/);
  const s = t.match(/([\d.]+)s/);
  if (h) {
    matched = true;
    total += parseInt(h[1], 10) * 3600;
  }
  if (m) {
    matched = true;
    total += parseInt(m[1], 10) * 60;
  }
  if (s) {
    matched = true;
    total += parseFloat(s[1]);
  }
  if (!matched || !Number.isFinite(total)) return null;
  return total;
}

/** Rounds Groq’s duration to whole seconds, then formats compactly. Unknown shapes return as-is. */
export function formatGroqResetRounded(raw: string): string {
  const sec = parseGroqResetDurationSeconds(raw);
  if (sec == null) return raw.trim();
  const r = Math.round(sec);
  if (r < 60) return `${r}s`;
  if (r < 3600) {
    const mins = Math.floor(r / 60);
    const secs = r % 60;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(r / 3600);
  const rem = r % 3600;
  const mins = Math.floor(rem / 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Earliest local time (ms) to re-query Groq for fresh limits: snapshot time plus each
 * parsed `reset*` duration. No invented usage—only Groq’s durations vs when we stored the snapshot.
 */
export function nextGroqQuotaRefreshAtMs(
  u: GroqTranscriptionUsage | null | undefined,
): number | null {
  if (!u?.snapshotAtMs || typeof u.snapshotAtMs !== "number") return null;
  const base = u.snapshotAtMs;
  const candidates: number[] = [];
  const push = (raw: string | undefined) => {
    const t = raw?.trim();
    if (!t) return;
    const sec = parseGroqResetDurationSeconds(t);
    if (sec == null || !Number.isFinite(sec) || sec < 0) return;
    candidates.push(base + Math.ceil(sec * 1000));
  };
  push(u.resetTokens);
  push(u.resetRequests);
  if (!candidates.length) return null;
  return Math.min(...candidates);
}

/** Remaining share of a limit row, 0–100 (from header numbers only). */
export function quotaLineRemainingPercent(line: GroqQuotaLine): number {
  if (line.limit <= 0) return 0;
  return Math.round(
    Math.min(100, Math.max(0, (line.remaining / line.limit) * 100)),
  );
}

/** Chat-relevant first: tokens per minute (TPM), then requests per day (RPD). */
export function groqQuotaLinesSortedForDisplay(
  lines: GroqQuotaLine[],
): GroqQuotaLine[] {
  const order = (k: GroqQuotaLine["key"]) => (k === "tokens" ? 0 : 1);
  return [...lines].sort((a, b) => order(a.key) - order(b.key));
}

/**
 * Build quota rows only when Groq returns a full limit + remaining pair.
 * Audio-seconds (ASH/ASD) quotas are not exposed on these headers — omitted on purpose.
 */
export function groqQuotaLinesFromUsage(
  u: GroqTranscriptionUsage | null | undefined,
): GroqQuotaLine[] {
  if (!u) return [];
  const out: GroqQuotaLine[] = [];

  if (
    typeof u.limitRequests === "number" &&
    Number.isFinite(u.limitRequests) &&
    u.limitRequests > 0 &&
    typeof u.remainingRequests === "number" &&
    Number.isFinite(u.remainingRequests) &&
    u.remainingRequests >= 0
  ) {
    const limit = u.limitRequests;
    const remaining = Math.min(limit, Math.max(0, u.remainingRequests));
    const used = Math.max(0, Math.min(limit, limit - remaining));
    out.push({
      key: "requests",
      shortLabel: "Daily limit",
      remaining,
      limit,
      used,
      reset: u.resetRequests?.trim() || undefined,
    });
  }

  if (
    typeof u.limitTokens === "number" &&
    Number.isFinite(u.limitTokens) &&
    u.limitTokens > 0 &&
    typeof u.remainingTokens === "number" &&
    Number.isFinite(u.remainingTokens) &&
    u.remainingTokens >= 0
  ) {
    const limit = u.limitTokens;
    const remaining = Math.min(limit, Math.max(0, u.remainingTokens));
    const used = Math.max(0, Math.min(limit, limit - remaining));
    out.push({
      key: "tokens",
      shortLabel: "This minute’s limit",
      remaining,
      limit,
      used,
      reset: u.resetTokens?.trim() || undefined,
    });
  }

  return out;
}
