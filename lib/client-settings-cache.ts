"use client";

import type { Settings } from "./types";
import { mergeSettingsPartial } from "./settings-merge";

/** Mirrors server settings for instant boot + offline-ish recovery (BYOK stays on-device). */
export const JARVIX_SETTINGS_MIRROR_KEY = "jarvix_settings_mirror";

const LEGACY_JARVIX_SETTINGS_MIRROR_KEY = "jarvix_settings_mirror";

export function readSettingsMirror(): Settings | null {
  if (typeof window === "undefined") return null;
  try {
    let raw = localStorage.getItem(JARVIX_SETTINGS_MIRROR_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_JARVIX_SETTINGS_MIRROR_KEY);
    }
    if (!raw) return null;
    return mergeSettingsPartial(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return null;
  }
}

export function writeSettingsMirror(settings: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(JARVIX_SETTINGS_MIRROR_KEY, JSON.stringify(settings));
  localStorage.removeItem(LEGACY_JARVIX_SETTINGS_MIRROR_KEY);
}

export function clearSettingsMirror() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(JARVIX_SETTINGS_MIRROR_KEY);
  localStorage.removeItem(LEGACY_JARVIX_SETTINGS_MIRROR_KEY);
}
