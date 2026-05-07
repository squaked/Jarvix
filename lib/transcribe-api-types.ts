/**
 * Groq rate-limit metadata forwarded from transcription responses.
 * @see https://console.groq.com/docs/rate-limits#handling-rate-limits
 *
 * Headers are described in Groq docs; `retry-after` (seconds) is only set on 429.
 * `x-ratelimit-limit-requests` / `remaining` / `reset` refer to **requests per day (RPD)** at org level;
 * `x-ratelimit-*-tokens` refer to **tokens per minute (TPM)** for text models (chat).
 * Audio-second (ASH/ASD) caps are not represented in these headers.
 */
export type GroqTranscriptionUsage = {
  /** When this snapshot was stored locally (ms). Used with Groq reset durations to schedule refresh—not from Groq. */
  snapshotAtMs?: number;
  retryAfterSeconds?: number;
  limitRequests?: number;
  remainingRequests?: number;
  resetRequests?: string;
  limitTokens?: number;
  remainingTokens?: number;
  resetTokens?: string;
};

export type TranscribeApiResponse = {
  text?: string;
  error?: string;
  usage?: GroqTranscriptionUsage;
};
