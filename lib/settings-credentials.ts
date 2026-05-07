import { PROVIDER_IDS } from "./provider-options";
import type { Settings } from "./types";

export function getActiveProfile(settings: Settings) {
  return settings.profiles[settings.provider];
}

export function hasActiveApiKey(settings: Settings): boolean {
  return Boolean(getActiveProfile(settings).apiKey?.trim());
}

/** True if at least one vendor has a saved key (app is past first-time setup). */
export function hasAnyApiKey(settings: Settings): boolean {
  return PROVIDER_IDS.some((id) => settings.profiles[id]?.apiKey?.trim());
}
