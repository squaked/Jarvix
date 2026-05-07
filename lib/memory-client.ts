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
