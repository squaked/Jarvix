import type { MemoryEntry } from "./types";

export async function fetchMemories(): Promise<MemoryEntry[]> {
  const res = await fetch("/api/memory");
  if (!res.ok) throw new Error("Failed to load memory");
  const data = (await res.json()) as { memories?: MemoryEntry[] };
  return data.memories ?? [];
}

export async function deleteMemoryRemote(id: string): Promise<void> {
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleteId: id }),
  });
  if (!res.ok) throw new Error("Failed to delete memory");
}

export async function clearAllMemoryRemote(): Promise<void> {
  const res = await fetch("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clearAll: true }),
  });
  if (!res.ok) throw new Error("Failed to clear memory");
}
