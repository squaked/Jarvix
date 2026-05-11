"use client";

import { Input } from "@/components/ui/Input";
import {
  DISPLAY_NAME_MAX,
  PERSONALITY_CUSTOM_MAX,
} from "@/lib/agent-personalization";
import type { AgentPersonalization, AgentPersonalityPreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PersonalityPresetCards } from "./PersonalityPresetCards";

type Props = {
  value: AgentPersonalization;
  onChange: (next: AgentPersonalization) => void;
  disabled?: boolean;
  /** Hide the name input (e.g. when shown standalone in onboarding). */
  hideDisplayName?: boolean;
};

export function AgentPersonalizationFields({
  value,
  onChange,
  disabled = false,
  hideDisplayName = false,
}: Props) {
  const setPersonalityPreset = (personalityPreset: AgentPersonalityPreset) =>
    onChange({ ...value, personalityPreset });

  return (
    <div className="space-y-6">
      {!hideDisplayName && (
        <div className="space-y-2">
          <label
            htmlFor="agent-display-name"
            className="block text-sm font-medium text-text"
          >
            What should Jarvix call you?
          </label>
          <Input
            id="agent-display-name"
            value={value.displayName}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="Optional — first name or nickname"
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, displayName: e.target.value })
            }
            className="text-base"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">
            Personality &amp; tone
          </label>
          <PersonalityPresetCards
            value={value.personalityPreset}
            onChange={setPersonalityPreset}
            disabled={disabled}
          />
        </div>

        {value.personalityPreset === "custom" ? (
          <div className="space-y-2 pt-1">
            <label
              htmlFor="agent-personality-custom"
              className="block text-sm font-medium text-text"
            >
              Custom personality
            </label>
            <textarea
              id="agent-personality-custom"
              value={value.personalityCustom}
              maxLength={PERSONALITY_CUSTOM_MAX}
              rows={4}
              disabled={disabled}
              placeholder="e.g. Dry understatement; treats complexity like a puzzle; never sarcastic about you."
              onChange={(e) =>
                onChange({ ...value, personalityCustom: e.target.value })
              }
              className={cn(
                "min-h-[104px] w-full resize-y rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text shadow-soft placeholder:text-muted",
                "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
