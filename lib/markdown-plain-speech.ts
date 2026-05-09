/**
 * Rough markdown → speakable plain text for TTS (no full parser; good enough for chat).
 * Strips code, images, and most formatting so Orpheus hears natural sentences.
 */
export function markdownToPlainSpeech(input: string): string {
  let s = input;

  // Attachment image markers from Jarvix chats
  s = s.replace(/!\[attachment\]\(data:[^)]*\)/gi, " ");

  // Fenced code blocks
  s = s.replace(/```[\s\S]*?```/g, " ");

  // Inline code
  s = s.replace(/`([^`]+)`/g, "$1");

  // Images ![alt](url)
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

  // Links [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Headings # ## ###
  s = s.replace(/^#{1,6}\s+/gm, "");

  // Blockquotes
  s = s.replace(/^\s*>\s?/gm, "");

  // Horizontal rules
  s = s.replace(/^\s*(?:---|\*\*\*|___)\s*$/gm, " ");

  // Bold / italic markers
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");

  // List markers

  s = s.replace(/^\s*[-*+]\s+/gm, "");

  s = s.replace(/^\s*\d+\.\s+/gm, "");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
