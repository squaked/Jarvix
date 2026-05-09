import { speakBrowserTtsPreview } from "@/lib/tts-browser-preview";
import { TTS_VOICE_SAMPLE } from "@/lib/tts-voices";
import type { TtsVoiceId } from "@/lib/types";

/**
 * Plays voice preview using browser speech synthesis.
 */
export async function playBundledOrFallbackTtsPreview(
  voiceId: TtsVoiceId,
): Promise<void> {
  const sample = TTS_VOICE_SAMPLE[voiceId];
  await speakBrowserTtsPreview(voiceId, sample);
}
