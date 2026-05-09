import fs from "node:fs/promises";
import path from "node:path";
import { normalizeAgentPersonalization } from "./agent-personalization";
import type { Settings } from "./types";
import {
  mergeProfileRecords,
  mergeSettingsPartial,
  normalizeTtsSettings,
} from "./settings-merge";
import { getJarvixProjectDataDir } from "./project-data-dir";

function settingsPath() {
  return path.join(getJarvixProjectDataDir(), "settings.json");
}

async function ensureDir() {
  await fs.mkdir(getJarvixProjectDataDir(), { recursive: true, mode: 0o700 });
}

export async function readSettingsFile(): Promise<Settings> {
  try {
    const raw = await fs.readFile(settingsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return mergeSettingsPartial(parsed);
  } catch {
    return mergeSettingsPartial({});
  }
}

export async function writeSettingsFile(full: Settings): Promise<Settings> {
  await ensureDir();
  await fs.writeFile(settingsPath(), JSON.stringify(full, null, 2), "utf-8");
  return full;
}

export async function updateSettingsFile(
  patch: Partial<Settings>,
): Promise<Settings> {
  const prev = await readSettingsFile();
  const merged: Partial<Settings> = {
    ...prev,
    ...patch,
    profiles:
      patch.profiles != null
        ? mergeProfileRecords(prev.profiles, patch.profiles)
        : prev.profiles,
    agent:
      patch.agent != null && typeof patch.agent === "object"
        ? normalizeAgentPersonalization({
            ...prev.agent,
            ...patch.agent,
          })
        : prev.agent,
    tts:
      patch.tts != null && typeof patch.tts === "object"
        ? normalizeTtsSettings({ ...prev.tts, ...patch.tts })
        : prev.tts,
  };
  const next = mergeSettingsPartial(merged);
  return writeSettingsFile(next);
}

export async function clearSettingsFile(): Promise<Settings> {
  return writeSettingsFile(mergeSettingsPartial({}));
}
