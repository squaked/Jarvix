import type { TtsVoiceId } from "./types";

/** English Orpheus personas Jarvix exposes (see Groq Orpheus docs). */
export const ORPHEUS_ENGLISH_VOICES: readonly {
  id: TtsVoiceId;
  label: string;
}[] = [
  { id: "troy", label: "Troy" },
  { id: "austin", label: "Austin" },
  { id: "autumn", label: "Autumn" },
  { id: "hannah", label: "Hannah" },
] as const;

const VOICE_SET = new Set<string>(
  ORPHEUS_ENGLISH_VOICES.map((v) => v.id),
);

/** Short sample within Orpheus’s 200-character limit (also used for Settings browser preview copy). */
export const TTS_VOICE_SAMPLE: Record<TtsVoiceId, string> = {
  troy: "Hi, I’m Troy — this is how I sound in Jarvix. Easy and conversational.",
  austin:
    "Hi, I’m Austin — this is how I sound in Jarvix. [casual] Let’s get going.",
  autumn:
    "Hi, I’m Autumn — this is how I sound in Jarvix. [friendly] Nice to meet you.",
  hannah:
    "Hi, I’m Hannah — this is how I sound in Jarvix. [warm] Thanks for listening.",
};

export const ORPHEUS_TTS_MODEL =
  "canopylabs/orpheus-v1-english" as const;

export const ORPHEUS_TTS_MAX_INPUT_CHARS = 200;

export function isTtsVoiceId(v: string): v is TtsVoiceId {
  return VOICE_SET.has(v);
}
