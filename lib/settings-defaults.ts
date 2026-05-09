import { DEFAULT_AGENT_PERSONALIZATION } from "./agent-personalization";
import { DEFAULT_MODEL, PROVIDER_IDS } from "./provider-options";
import type { Provider } from "./provider-options";
import type { ProviderProfile, Settings } from "./types";

/** Browser keys used before settings moved server-side (newest first). */
export const SETTINGS_LOCALSTORAGE_LEGACY_KEYS = [
  "jarvix_settings",
  "jarvix_settings",
] as const;

export function createDefaultProfiles(): Record<Provider, ProviderProfile> {
  return Object.fromEntries(
    PROVIDER_IDS.map((id) => [
      id,
      { apiKey: "", model: DEFAULT_MODEL[id] },
    ]),
  ) as Record<Provider, ProviderProfile>;
}

export const DEFAULT_JARVIX_SETTINGS: Settings = {
  provider: "groq",
  memoryEnabled: true,
  profiles: createDefaultProfiles(),
  agent: { ...DEFAULT_AGENT_PERSONALIZATION },
  weatherLocation: "Paris",
  tts: {
    enabled: false,
    autoReadReplies: true,
    voice: "hannah",
  },
};
