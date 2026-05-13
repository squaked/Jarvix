"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ORPHEUS_ENGLISH_VOICES } from "@/lib/tts-voices";
import { useGroqTts } from "@/lib/use-groq-tts";
import { useJarvixSettings } from "@/lib/settings";
import type { TtsVoiceId } from "@/lib/types";
import { useState } from "react";

type Props = {
  onSaved?: () => void;
};

export function TtsSettingsCard({ onSaved }: Props) {
  const { settings, saveSettings } = useJarvixSettings();
  const tts = settings.tts;
  const { speak, stop } = useGroqTts();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const patch = async (next: Partial<typeof tts>) => {
    // If enabling TTS, we always force autoReadReplies to true as per user request
    if (next.enabled === true) {
      next.autoReadReplies = true;
    }
    await saveSettings({ tts: { ...tts, ...next } });
    onSaved?.();
  };

  const previewVoice = async () => {
    setPreviewError(null);
    setPreviewBusy(true);
    stop();
    try {
      await speak({
        messageId: "preview",
        plainText: "Hi! This is what I sound like. I'm ready to help you.",
        voice: tts.voice,
        settings,
      });
    } catch {
      setPreviewError("Preview failed. Check your API key or connection.");
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="font-display text-lg font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 20' }}
          >
            Read aloud
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {"Jarvix will read his replies using Groq's high-quality voices."}
          </p>
        </div>
        <button
          onClick={() => void patch({ enabled: !tts.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            tts.enabled ? "bg-accent" : "bg-muted/30"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              tts.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {tts.enabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted/80 px-1">
              Voice Selection
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  value={tts.voice}
                  onChange={(e) => void patch({ voice: e.target.value as TtsVoiceId })}
                >
                  {ORPHEUS_ENGLISH_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={previewBusy}
                onClick={() => void previewVoice()}
                className="shrink-0 h-11 px-6"
              >
                {previewBusy ? "..." : "Play Preview"}
              </Button>
            </div>
          </div>

          {previewError && (
            <p
              className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs text-red-600 dark:text-red-400 animate-in slide-in-from-top-1"
              role="alert"
            >
              {previewError}
            </p>
          )}

          <p className="text-[10px] text-muted leading-relaxed px-1">
            Note: Replies will be automatically read aloud when they finish generating. 
            You can also toggle this quickly using the speaker icon in the header.
          </p>
        </div>
      )}
    </Card>
  );
}
