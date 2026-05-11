"use client";

import { Button } from "@/components/ui/Button";
import { ORPHEUS_ENGLISH_VOICES } from "@/lib/tts-voices";
import { useGroqTts } from "@/lib/use-groq-tts";
import { useJarvixSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { TtsVoiceId } from "@/lib/types";
import { useState } from "react";

type Props = {
  value: TtsVoiceId;
  onChange: (next: TtsVoiceId) => void;
  disabled?: boolean;
};

export function TtsVoiceSelection({ value, onChange, disabled }: Props) {
  const { settings } = useJarvixSettings();
  const { speak, stop } = useGroqTts();
  const [previewBusy, setPreviewBusy] = useState<TtsVoiceId | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewVoice = async (voiceId: TtsVoiceId) => {
    setPreviewError(null);
    setPreviewBusy(voiceId);
    stop();
    try {
      await speak({
        messageId: "preview",
        plainText: "Hi! This is what I sound like. I'm ready to help you.",
        voice: voiceId,
        settings,
      });
    } catch {
      setPreviewError("Preview failed. Check your API key or connection.");
    } finally {
      setPreviewBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {previewError ? (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {previewError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ORPHEUS_ENGLISH_VOICES.map((v) => {
          const selected = value === v.id;
          return (
            <div
              key={v.id}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-3.5 py-3 transition-all",
                selected
                  ? "border-accent bg-accent/[0.07] shadow-[0_0_0_3px_var(--accent-soft)]"
                  : "border-border bg-surface hover:border-accent/40",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                className="min-w-0 flex-1 text-left"
                onClick={() => onChange(v.id)}
              >
                <span className="block font-medium text-text">{v.label}</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 px-2 py-1 text-xs h-8"
                disabled={previewBusy !== null || disabled}
                onClick={() => void previewVoice(v.id)}
              >
                {previewBusy === v.id ? "…" : "Play"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
