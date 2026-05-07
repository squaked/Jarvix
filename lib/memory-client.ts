"use client";

import type { MemoryEntry } from "./types";
import {
  clearBrowserMemory,
  deleteBrowserMemory,
  mergeRemoteMemory,
  readBrowserMemory,
} from "./browser-memory-store";

export async function fetchMemories(): Promise<MemoryEntry[]> {
  try {
    const res = await fetch("/api/memory");
    if (res.ok) {
      const data = (await res.json()) as { memories?: MemoryEntry[] };
      const remote = data.memories ?? [];
      await mergeRemoteMemory(remote);
    }
  } catch {
    /* offline / serverless — rely on browser */
  }
  return readBrowserMemory();
}

export async function deleteMemoryRemote(id: string): Promise<void> {
  await deleteBrowserMemory(id);
  try {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
  } catch {
    /* best-effort */
  }
}

export async function clearAllMemoryRemote(): Promise<void> {
  await clearBrowserMemory();
  try {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearAll: true }),
    });
  } catch {
    /* best-effort */
  }
}

export async function pushMemoryMergeToServer(entries: MemoryEntry[]): Promise<void> {
  const list = entries.filter(
    (m): m is MemoryEntry =>
      typeof m === "object" &&
      m !== null &&
      typeof m.id === "string" &&
      typeof (m as MemoryEntry).fact === "string" &&
      typeof (m as MemoryEntry).createdAt === "string",
  );
  if (list.length === 0) return;
  try {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mergeImport: list }),
    });
  } catch {
    /* best-effort */
  }
}
