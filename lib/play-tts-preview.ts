"use client";

import { speakBrowserTtsPreview } from "@/lib/tts-browser-preview";
import { TTS_PREVIEW_WAV_PUBLIC } from "@/lib/tts-preview-assets";
import { TTS_VOICE_SAMPLE } from "@/lib/tts-voices";
import type { TtsVoiceId } from "@/lib/types";

/**
 * Plays bundled Orpheus WAV under `public/tts-previews/` when load succeeds;
 * falls back to speechSynthesis (e.g. before `npm run generate:tts-previews`).
 */
export async function playBundledOrFallbackTtsPreview(
  voiceId: TtsVoiceId,
): Promise<void> {
  const src = TTS_PREVIEW_WAV_PUBLIC[voiceId];
  const sample = TTS_VOICE_SAMPLE[voiceId];

  const audio = new Audio(src);

  try {
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        audio.onended = null;
        audio.onerror = null;
      };
      audio.onended = () => {
        done();
        resolve();
      };
      audio.onerror = () => {
        done();
        reject(new Error("preview asset failed"));
      };
      void audio.play().catch((e) => {
        done();
        reject(e instanceof Error ? e : new Error("preview play failed"));
      });
    });
  } catch {
    await speakBrowserTtsPreview(voiceId, sample);
  }
}
