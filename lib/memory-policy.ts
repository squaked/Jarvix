import type { MemoryEntry } from "./types";

/** Bounds to keep disk, prompts, and follow-up extraction small. */
export const MEMORY_LIMITS = {
  /** Max facts kept on disk (oldest dropped). */
  maxStored: 28,
  /** Max bullet lines injected into the chat system prompt. */
  maxPromptLines: 10,
  /** Hard cap on characters for the memory block in-system (excl. label). */
  maxPromptChars: 800,
  /** Per-fact length when persisting or showing in prompt. */
  maxFactChars: 96,
} as const;

export function normalizeFact(text: string): string {
  let t = text.trim().replace(/\s+/g, " ");
  const max = MEMORY_LIMITS.maxFactChars;
  if (t.length > max) {
    t = `${t.slice(0, max - 1)}…`;
  }
  return t;
}

/** Keep the newest entries; returns sorted oldest-first for stable storage. */
export function capMemoryEntries(entries: MemoryEntry[]): MemoryEntry[] {
  const limit = MEMORY_LIMITS.maxStored;
  if (entries.length <= limit) {
    return [...entries].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  return [...entries]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

/** Union memory lists deduping by normalized fact text (first occurrence wins ordering). */
export function mergeMemorySources(...lists: MemoryEntry[][]): MemoryEntry[] {
  const seen = new Set<string>();
  const out: MemoryEntry[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      const k = normalizeFact(m.fact).toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(m);
    }
  }
  return capMemoryEntries(out);
}

/**
 * Most recent first, trim for system prompt token budget.
 */
export function formatMemoryForSystemPrompt(entries: MemoryEntry[]): string {
  const { maxPromptLines, maxPromptChars, maxFactChars } = MEMORY_LIMITS;
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const lines: string[] = [];
  let used = 0;
  for (const m of sorted) {
    if (lines.length >= maxPromptLines) break;
    let fact = normalizeFact(m.fact);
    if (!fact) continue;
    const line = `• ${fact}`;
    const addLen = line.length + (lines.length ? 1 : 0); // newline
    if (used + addLen > maxPromptChars) {
      const room = maxPromptChars - used - 3 - 2;
      if (room < 24) break;
      fact = fact.slice(0, Math.min(fact.length, maxFactChars, room)).trimEnd();
      if (fact.length < 12) break;
      lines.push(`• ${fact}…`);
      break;
    }
    lines.push(line);
    used += addLen;
  }
  return lines.join("\n");
}
