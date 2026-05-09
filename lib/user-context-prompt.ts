import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import type { Settings } from "@/lib/types";

/** Stable facts shown to the model (Settings-derived; not live device signals). */
export function formatUserContextForPrompt(settings: Settings): string {
  const loc =
    settings.weatherLocation.trim() ||
    DEFAULT_JARVIX_SETTINGS.weatherLocation;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `User context (from Settings — the user’s chosen home / weather place, not device GPS):
- Weather location: ${loc}
- Current time: ${dateStr}, ${timeStr}
When they ask about weather "here", "locally", or "for me" without naming a city, use the weather tool with this location (or a clear spelling variant).`;
}
