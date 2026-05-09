import type { TtsVoiceId } from "./types";

/** English Orpheus personas (see Groq Orpheus docs). */
export const ORPHEUS_ENGLISH_VOICES: readonly {
  id: TtsVoiceId;
  label: string;
}[] = [
  { id: "autumn", label: "Autumn" },
  { id: "diana", label: "Diana" },
  { id: "hannah", label: "Hannah" },
  { id: "austin", label: "Austin" },
  { id: "daniel", label: "Daniel" },
  { id: "troy", label: "Troy" },
] as const;

const VOICE_SET = new Set<string>(
  ORPHEUS_ENGLISH_VOICES.map((v) => v.id),
);

/** Short sample within Orpheus’s 200-character limit (for previews). */
export const TTS_VOICE_SAMPLE: Record<TtsVoiceId, string> = {
  autumn:
    "Hi, I’m Autumn — this is how I sound in Jarvix. [friendly] Nice to meet you.",
  diana:
    "Hi, I’m Diana — this is how I sound in Jarvix. [professionally] Ready when you are.",
  hannah:
    "Hi, I’m Hannah — this is how I sound in Jarvix. [warm] Thanks for listening.",
  austin:
    "Hi, I’m Austin — this is how I sound in Jarvix. [casual] Let’s get going.",
  daniel:
    "Hi, I’m Daniel — this is how I sound in Jarvix. [clear] All set over here.",
  troy: "Hi, I’m Troy — this is how I sound in Jarvix. Easy and conversational.",
};

export const ORPHEUS_TTS_MODEL =
  "canopylabs/orpheus-v1-english" as const;

export const ORPHEUS_TTS_MAX_INPUT_CHARS = 200;

export function isTtsVoiceId(v: string): v is TtsVoiceId {
  return VOICE_SET.has(v);
}
