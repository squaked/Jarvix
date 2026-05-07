"use client";

import {
  capMemoryEntries,
  mergeMemorySources,
  normalizeFact,
} from "./memory-policy";
import type { MemoryEntry } from "./types";
import { readJarvixKey, jarvixIdbUsable, writeJarvixKey } from "./idb-kv";

const IDB_MEMORY_KEY = "jarvix_memory_v1";
const LS_MEMORY_FALLBACK_KEY = "jarvix_memory_v1_fallback";

export function normalizeMemoryEntries(list: unknown): MemoryEntry[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (m): m is MemoryEntry =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as MemoryEntry).id === "string" &&
      typeof (m as MemoryEntry).fact === "string",
  );
}

function readMemoryLocalStorage(): MemoryEntry[] {
  try {
    const ls = localStorage.getItem(LS_MEMORY_FALLBACK_KEY);
    if (!ls) return [];
    return capMemoryEntries(normalizeMemoryEntries(JSON.parse(ls) as unknown));
  } catch {
    return [];
  }
}

function writeMemoryLocalStorage(entries: MemoryEntry[]): void {
  try {
    const capped = capMemoryEntries(entries);
    localStorage.setItem(LS_MEMORY_FALLBACK_KEY, JSON.stringify(capped));
  } catch {
    /* quota */
  }
}

export async function readBrowserMemory(): Promise<MemoryEntry[]> {
  let fromIdb: MemoryEntry[] = [];
  try {
    if (await jarvixIdbUsable()) {
      const raw = await readJarvixKey(IDB_MEMORY_KEY);
      fromIdb = capMemoryEntries(normalizeMemoryEntries(raw));
    }
  } catch {
    /* noop */
  }
  const fromLs = readMemoryLocalStorage();
  return capMemoryEntries(mergeMemorySources(fromIdb, fromLs));
}

export async function writeBrowserMemory(entries: MemoryEntry[]): Promise<void> {
  const capped = capMemoryEntries(entries);
  writeMemoryLocalStorage(capped);
  try {
    if (await jarvixIdbUsable()) {
      await writeJarvixKey(IDB_MEMORY_KEY, capped);
    }
  } catch {
    /* localStorage still holds data */
  }
}

export async function mergeRemoteMemory(remote: MemoryEntry[]): Promise<void> {
  const local = await readBrowserMemory();
  await writeBrowserMemory(mergeMemorySources(local, normalizeMemoryEntries(remote)));
}

/** Append one entry (dedupe by normalized fact), same policy as disk. */
export async function appendBrowserMemory(entry: MemoryEntry): Promise<void> {
  const list = await readBrowserMemory();
  const key = normalizeFact(entry.fact).toLowerCase();
  const dup = list.some((m) => normalizeFact(m.fact).toLowerCase() === key);
  if (dup) return;
  await writeBrowserMemory(capMemoryEntries([...list, entry]));
}

export async function deleteBrowserMemory(id: string): Promise<void> {
  const list = (await readBrowserMemory()).filter((m) => m.id !== id);
  await writeBrowserMemory(list);
}

export async function clearBrowserMemory(): Promise<void> {
  await writeBrowserMemory([]);
}
