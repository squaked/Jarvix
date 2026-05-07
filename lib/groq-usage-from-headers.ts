import type { GroqTranscriptionUsage } from "./transcribe-api-types";

/** True when there is nothing to show in the UI (ignores client-only `snapshotAtMs`). */
export function isGroqUsagePayloadEmpty(u: GroqTranscriptionUsage): boolean {
  const ignore: (keyof GroqTranscriptionUsage)[] = ["snapshotAtMs"];
  return Object.entries(u).every(
    ([k, v]) =>
      ignore.includes(k as keyof GroqTranscriptionUsage) ||
      v === undefined ||
      v === null ||
      v === "",
  );
}

function headerGet(
  headers: Headers | Record<string, string> | null | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const rec = headers as Record<string, string>;
  const direct = rec[name];
  if (direct !== undefined) return direct;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(rec)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

/**
 * Parse Groq `x-ratelimit-*` / `retry-after` from any HTTP-ish header bag.
 * @see https://console.groq.com/docs/rate-limits#handling-rate-limits
 */
export function groqUsageFromHeaders(
  headers: Headers | Record<string, string> | null | undefined,
): GroqTranscriptionUsage {
  const out: GroqTranscriptionUsage = {};

  const retryAfter = headerGet(headers, "retry-after");
  if (retryAfter != null) {
    const s = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(s) && s >= 0) out.retryAfterSeconds = s;
  }

  const lr = headerGet(headers, "x-ratelimit-limit-requests");
  if (lr != null) {
    const n = Number.parseInt(lr, 10);
    if (Number.isFinite(n)) out.limitRequests = n;
  }
  const rr = headerGet(headers, "x-ratelimit-remaining-requests");
  if (rr != null) {
    const n = Number.parseInt(rr, 10);
    if (Number.isFinite(n)) out.remainingRequests = n;
  }
  const resetR = headerGet(headers, "x-ratelimit-reset-requests");
  if (resetR) out.resetRequests = resetR;

  const lt = headerGet(headers, "x-ratelimit-limit-tokens");
  if (lt != null) {
    const n = Number.parseInt(lt, 10);
    if (Number.isFinite(n)) out.limitTokens = n;
  }
  const rt = headerGet(headers, "x-ratelimit-remaining-tokens");
  if (rt != null) {
    const n = Number.parseInt(rt, 10);
    if (Number.isFinite(n)) out.remainingTokens = n;
  }
  const resetT = headerGet(headers, "x-ratelimit-reset-tokens");
  if (resetT) out.resetTokens = resetT;

  return out;
}
