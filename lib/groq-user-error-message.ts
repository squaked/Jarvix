/**
 * Groq Console — open this model once so an org admin can accept usage terms.
 * Speech API returns `model_terms_required` until then.
 */
export const ORPHEUS_ENGLISH_TERMS_PLAYGROUND_URL =
  "https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english" as const;

type GroqErrorPayload = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

/**
 * Parses Groq/OpenAI-compatible JSON error bodies into one line suitable for banners and previews.
 */
export function formatGroqApiErrorBodyForUser(rawBody: string): string {
  const raw = rawBody.trim();
  if (!raw) return "Groq request failed.";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as GroqErrorPayload;
  } catch {
    return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
  }

  const err =
    parsed && typeof parsed === "object" && "error" in parsed
      ? (parsed as GroqErrorPayload).error
      : undefined;
  const code = typeof err?.code === "string" ? err.code : "";
  const msg = typeof err?.message === "string" ? err.message.trim() : "";

  if (
    code === "model_terms_required" ||
    /\brequires terms acceptance\b/i.test(msg)
  ) {
    return (
      "Orpheus text-to-speech needs a one-time model terms acceptance in Groq Console " +
      "(your workspace admin): open this link while signed in, accept, then try again — " +
      ORPHEUS_ENGLISH_TERMS_PLAYGROUND_URL
    );
  }

  if (msg) return msg;
  return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
}
