import { createGroq } from "@ai-sdk/groq";
import { JARVIX_GROQ_CHAT_MODEL } from "./provider-options";
import { resolveGroqApiKey } from "./settings-credentials";
import type { Settings } from "./types";

/**
 * Create a chat model for the configured Groq API key.
 * Chat model id is fixed ({@link JARVIX_GROQ_CHAT_MODEL}); stored profile `model` is ignored for chat.
 */
export function getLanguageModel(settings: Settings) {
  const apiKey = resolveGroqApiKey(settings);
  if (!apiKey) {
    throw new Error(
      "Missing Groq API key. Paste your key in Jarvix settings or set GROQ_API_KEY in your environment.",
    );
  }

  const groq = createGroq({ apiKey });
  return groq(JARVIX_GROQ_CHAT_MODEL);
}
