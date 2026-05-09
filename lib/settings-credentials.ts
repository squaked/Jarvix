import { PROVIDER_IDS } from "./provider-options";
import type { Settings } from "./types";

export function getActiveProfile(settings: Settings) {
  return settings.profiles[settings.provider];
}

/** Groq key from saved profile, or `GROQ_API_KEY` env (same as jarvix-model). */
export function resolveGroqApiKey(settings: Settings): string {
  const fromProfile = settings.profiles.groq?.apiKey?.trim() ?? "";
  return fromProfile || process.env.GROQ_API_KEY?.trim() || "";
}

export function hasActiveApiKey(settings: Settings): boolean {
  return Boolean(getActiveProfile(settings).apiKey?.trim());
}

/** True when Groq can be called for chat/TTS — profile key or env. */
export function hasGroqInferenceCredential(settings: Settings): boolean {
  return Boolean(resolveGroqApiKey(settings));
}

/** True if at least one vendor has a saved key (app is past first-time setup). */
export function hasAnyApiKey(settings: Settings): boolean {
  return PROVIDER_IDS.some((id) => settings.profiles[id]?.apiKey?.trim());
}
