"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ORPHEUS_ENGLISH_VOICES,
  TTS_VOICE_SAMPLE,
} from "@/lib/tts-voices";
import { ORPHEUS_ENGLISH_TERMS_PLAYGROUND_URL } from "@/lib/groq-user-error-message";
import { useJarvixSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { TtsVoiceId } from "@/lib/types";
import { useState } from "react";

type Props = {
  onSaved?: () => void;
};

export function TtsSettingsCard({ onSaved }: Props) {
  const { settings, saveSettings } = useJarvixSettings();
  const tts = settings.tts;
  const [previewBusy, setPreviewBusy] = useState<TtsVoiceId | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const patch = async (next: typeof tts) => {
    await saveSettings({ tts: next });
    onSaved?.();
  };

  const previewVoice = async (voiceId: TtsVoiceId) => {
    setPreviewError(null);
    setPreviewBusy(voiceId);
    try {
      const text = TTS_VOICE_SAMPLE[voiceId];
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceId, settings }),
      });
      if (!res.ok) {
        let msg =
          res.status === 401
            ? "Add your Groq API key (or set GROQ_API_KEY on the server) to use previews."
            : `Preview failed (${res.status}).`;
        try {
          const err = (await res.json()) as { error?: string };
          if (typeof err.error === "string" && err.error.trim()) {
            msg = err.error.trim();
          }
        } catch {
          /* noop */
        }
        setPreviewError(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewError("Playback failed.");
      };
      await audio.play();
    } catch {
      setPreviewError(
        "Playback blocked or network error — allow audio or try again.",
      );
    } finally {
      setPreviewBusy(null);
    }
  };

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Read aloud
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Uses Groq&apos;s {" "}
          <a
            className="text-accent underline-offset-4 hover:underline"
            href="https://console.groq.com/docs/text-to-speech/orpheus"
            target="_blank"
            rel="noreferrer"
          >
            Orpheus text-to-speech
          </a>{" "}
          with your Groq API key — same billing as chat. Each segment is limited
          to 200 characters; long replies play in sequence.
        </p>
        <p className="mt-2 text-xs text-muted">
          If previews fail with terms or model acceptance, ask your Groq workspace
          admin to{" "}
          <a
            className="text-accent underline-offset-4 hover:underline"
            href={ORPHEUS_ENGLISH_TERMS_PLAYGROUND_URL}
            target="_blank"
            rel="noreferrer"
          >
            open Orpheus in Console once
          </a>{" "}
          and accept the model terms.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-[var(--accent)]"
            checked={tts.enabled}
            onChange={(e) =>
              void patch({ ...tts, enabled: e.target.checked }).catch(() => {})
            }
          />
          <span className="text-sm font-medium text-text">Read replies aloud</span>
        </label>
        <span className="text-xs text-muted">
          Quick toggle is also in the header (home &amp; chat).
        </span>
      </div>

      <label className="flex cursor-pointer items-center gap-3 opacity-100">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-[var(--accent)]"
          checked={tts.autoReadReplies}
          disabled={!tts.enabled}
          onChange={(e) =>
            void patch({ ...tts, autoReadReplies: e.target.checked }).catch(
              () => {},
            )
          }
        />
        <span className={cn("text-sm text-text", !tts.enabled && "text-muted")}>
          Auto-play when a new reply finishes
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Voice</p>
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
            const selected = tts.voice === v.id;
            return (
              <div
                key={v.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-3 py-2",
                  selected
                    ? "border-accent bg-accent/[0.07]"
                    : "border-border bg-surface",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm font-medium text-text"
                  onClick={() =>
                    void patch({ ...tts, voice: v.id }).catch(() => {})
                  }
                >
                  {v.label}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 px-2 py-1 text-xs"
                  disabled={previewBusy !== null}
                  onClick={() => void previewVoice(v.id)}
                >
                  {previewBusy === v.id ? "…" : "Play"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
