export type Provider = "groq";

export const PROVIDER_IDS: readonly Provider[] = ["groq"] as const;

export const LEGACY_PROFILE_KEYS = [
  "openrouter",
  "groq",
  "openai",
  "google",
  "anthropic",
] as const;

export const PROVIDER_LABEL: Record<Provider, string> = {
  groq: "Groq",
};

/** Fixed Groq chat model (no user-facing model picker). */
export const JARVIX_GROQ_CHAT_MODEL = "openai/gpt-oss-120b" as const;

export const DEFAULT_MODEL: Record<Provider, string> = {
  groq: JARVIX_GROQ_CHAT_MODEL,
};

export const PROVIDER_KEY_URL: Partial<Record<Provider, string>> = {
  groq: "https://console.groq.com/keys",
};
