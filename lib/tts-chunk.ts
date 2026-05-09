import { ORPHEUS_TTS_MAX_INPUT_CHARS } from "./tts-voices";

/**
 * Split text for Groq Orpheus (max 200 chars per request).
 * Prefers word boundaries; may split mid-word only for very long tokens.
 */
export function chunkTextForOrpheus(
  text: string,
  maxChars: number = ORPHEUS_TTS_MAX_INPUT_CHARS,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  let rest = trimmed;

  while (rest.length > 0) {
    if (rest.length <= maxChars) {
      chunks.push(rest);
      break;
    }
    let slice = rest.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > maxChars * 0.55) {
      slice = slice.slice(0, lastSpace);
    }
    chunks.push(slice.trimEnd());
    rest = rest.slice(slice.length).trimStart();
  }

  return chunks.filter(Boolean);
}
