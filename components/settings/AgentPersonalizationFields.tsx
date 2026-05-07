"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  AGENT_VOICE_OPTIONS,
  DISPLAY_NAME_MAX,
  VOICE_CUSTOM_MAX,
} from "@/lib/agent-personalization";
import type { AgentPersonalization, AgentVoicePreset } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: AgentPersonalization;
  onChange: (next: AgentPersonalization) => void;
  disabled?: boolean;
};

export function AgentPersonalizationFields({
  value,
  onChange,
  disabled = false,
}: Props) {
  const setVoicePreset = (voicePreset: AgentVoicePreset) =>
    onChange({ ...value, voicePreset });

  return (
    <div className="space-y-6">
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

      <div className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="agent-voice-preset"
            className="block text-sm font-medium text-text"
          >
            Voice & personality
          </label>
          <Select
            id="agent-voice-preset"
            value={value.voicePreset}
            disabled={disabled}
            onChange={(e) =>
              setVoicePreset(e.target.value as AgentVoicePreset)
            }
            className="text-base"
          >
            {AGENT_VOICE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </Select>
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
