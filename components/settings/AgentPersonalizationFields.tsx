"use client";

import { Input } from "@/components/ui/Input";
import {
  DISPLAY_NAME_MAX,
  VOICE_CUSTOM_MAX,
} from "@/lib/agent-personalization";
import type { AgentPersonalization, AgentVoicePreset } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VoicePresetCards } from "./VoicePresetCards";

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
  const setVoicePreset = (voicePreset: AgentVoicePreset) =>
    onChange({ ...value, voicePreset });

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
            Voice &amp; personality
          </label>
          <VoicePresetCards
            value={value.voicePreset}
            onChange={setVoicePreset}
            disabled={disabled}
          />
        </div>

        {value.voicePreset === "custom" ? (
          <div className="space-y-2 pt-1">
            <label
              htmlFor="agent-voice-custom"
              className="block text-sm font-medium text-text"
            >
              Custom voice
            </label>
            <textarea
              id="agent-voice-custom"
              value={value.voiceCustom}
              maxLength={VOICE_CUSTOM_MAX}
              rows={4}
              disabled={disabled}
              placeholder="e.g. Dry understatement; treats complexity like a puzzle; never sarcastic about you."
              onChange={(e) =>
                onChange({ ...value, voiceCustom: e.target.value })
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
