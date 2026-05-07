import { normalizeAgentPersonalization } from "./agent-personalization";
import { JARVIX_GROQ_CHAT_MODEL, LEGACY_PROFILE_KEYS } from "./provider-options";
import type { ProviderProfile, Settings } from "./types";
import { DEFAULT_JARVIX_SETTINGS, createDefaultProfiles } from "./settings-defaults";

/** Old flat settings shape (pre per-provider profiles). */
type LegacyFlat = {
  provider?: unknown;
  apiKey?: string;
  model?: string;
  memoryEnabled?: boolean;
  profiles?: Settings["profiles"] & Record<string, unknown>;
  agent?: unknown;
  weatherLocation?: unknown;
};

function readProfileSlot(
  slot: unknown,
  fallback: ProviderProfile,
): ProviderProfile {
  if (!slot || typeof slot !== "object") return fallback;
  const o = slot as { apiKey?: unknown; model?: unknown };
  return {
    apiKey: typeof o.apiKey === "string" ? o.apiKey : fallback.apiKey,
    model:
      typeof o.model === "string" && o.model.trim()
        ? o.model.trim()
        : fallback.model,
  };
}

/** Merges profile patches into a full profile map (used by server PATCH). */
export function mergeProfileRecords(
  prev: Settings["profiles"],
  patch: Partial<Record<string, Partial<ProviderProfile>>>,
): Settings["profiles"] {
  const out = { ...prev };
  const groqPatch = patch.groq;
  if (groqPatch) {
    const slot = out.groq;
    out.groq = {
      apiKey:
        typeof groqPatch.apiKey === "string" ? groqPatch.apiKey : slot.apiKey,
      model: JARVIX_GROQ_CHAT_MODEL,
    };
  }
  return out;
}

/** Normalizes arbitrary JSON/settings patches (server JSON + mirrors). */
export function mergeSettingsPartial(
  partial: Partial<Settings> | LegacyFlat | null | undefined,
): Settings {
  const p = (partial ?? {}) as LegacyFlat;

  const memoryEnabled =
    typeof p.memoryEnabled === "boolean"
      ? p.memoryEnabled
      : DEFAULT_JARVIX_SETTINGS.memoryEnabled;

  const profiles = normalizeProfiles(p);

  const agent = normalizeAgentPersonalization(p.agent);

  const weatherLocation =
    typeof p.weatherLocation === "string" && p.weatherLocation.trim()
      ? p.weatherLocation.trim()
      : DEFAULT_JARVIX_SETTINGS.weatherLocation;

  return {
    provider: "groq",
    memoryEnabled,
    profiles,
    agent,
    weatherLocation,
  };
}

function normalizeProfiles(p: LegacyFlat): Settings["profiles"] {
  const base = createDefaultProfiles();
  const raw = p.profiles;

  if (raw && typeof raw === "object") {
    const groqSlot = raw.groq;
    if (groqSlot) {
      base.groq = readProfileSlot(groqSlot, base.groq);
    }

    if (!base.groq.apiKey.trim()) {
      for (const legacy of LEGACY_PROFILE_KEYS) {
        if (legacy === "groq") continue;
        const slot = raw[legacy];
        const read = readProfileSlot(slot, { apiKey: "", model: "" });
        if (read.apiKey.trim()) {
          base.groq = {
            apiKey: read.apiKey,
            model: JARVIX_GROQ_CHAT_MODEL,
          };
          break;
        }
      }
    }
  }

  if (typeof p.apiKey === "string" || typeof p.model === "string") {
    base.groq = {
      apiKey: typeof p.apiKey === "string" ? p.apiKey : base.groq.apiKey,
      model: JARVIX_GROQ_CHAT_MODEL,
    };
  }

  base.groq = { ...base.groq, model: JARVIX_GROQ_CHAT_MODEL };
  return base;
}
