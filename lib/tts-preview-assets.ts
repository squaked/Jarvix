import type { TtsVoiceId } from "./types";

/**
 * Static WAVs committed under `public/tts-previews/` (generated via
 * `npm run generate:tts-previews`). Same keys as {@link ./tts-voices TTS_VOICE_SAMPLE}.
 */
export const TTS_PREVIEW_WAV_PUBLIC: Record<TtsVoiceId, string> = {
  troy: "/tts-previews/troy.wav",
  austin: "/tts-previews/austin.wav",
  autumn: "/tts-previews/autumn.wav",
  hannah: "/tts-previews/hannah.wav",
};
