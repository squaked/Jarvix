import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import type { MemoryEntry } from "./types";
import {
  MEMORY_LIMITS,
  capMemoryEntries,
  mergeMemorySources,
  normalizeFact,
} from "./memory-policy";
import { getJarvixProjectDataDir } from "./project-data-dir";

function serializeMemory(list: MemoryEntry[]): string {
  return JSON.stringify(list);
}

function legacyHomedirMemoryCandidates() {
  const home = os.homedir();
  return [
    path.join(home, ".jarvix", "memory.json"),
    path.join(home, ".jarvix", "memory.json"),
  ];
}

const memoryDir = () => getJarvixProjectDataDir();
const memoryFile = () => path.join(memoryDir(), "memory.json");

async function migrateLegacyMemoryFromHome(): Promise<void> {
  await fs.mkdir(memoryDir(), { recursive: true, mode: 0o700 });
  try {
    await fs.access(memoryFile());
    return;
  } catch {
    /* create new below */
  }
  for (const legacy of legacyHomedirMemoryCandidates()) {
    try {
      const raw = await fs.readFile(legacy, "utf-8");
      await fs.writeFile(memoryFile(), raw.trim(), "utf-8");
      return;
    } catch {
      /* try next */
    }
  }
}

async function ensureDir() {
  await migrateLegacyMemoryFromHome();
  await fs.mkdir(memoryDir(), { recursive: true, mode: 0o700 });
}

export async function getMemory(): Promise<MemoryEntry[]> {
  await migrateLegacyMemoryFromHome();
  try {
    const raw = await fs.readFile(memoryFile(), "utf-8");
    const data = JSON.parse(raw) as MemoryEntry[];
    const list = Array.isArray(data) ? data : [];
    if (list.length > MEMORY_LIMITS.maxStored) {
      const capped = capMemoryEntries(list);
      await ensureDir();
      await fs.writeFile(memoryFile(), serializeMemory(capped), "utf-8");
      return capped;
    }
    return list;
  } catch {
    return [];
  }
}

export async function addMemory(fact: string): Promise<MemoryEntry | null> {
  await ensureDir();
  const normalized = normalizeFact(fact);
  if (normalized.length < 6) return null;
  const entry: MemoryEntry = {
    id: randomUUID(),
    fact: normalized,
    createdAt: new Date().toISOString(),
  };
  const list = capMemoryEntries([...(await getMemory()), entry]);
  await fs.writeFile(memoryFile(), serializeMemory(list), "utf-8");
  return entry;
}

export async function deleteMemory(id: string): Promise<void> {
  await migrateLegacyMemoryFromHome();
  const list = (await getMemory()).filter((m) => m.id !== id);
  await ensureDir();
  await fs.writeFile(memoryFile(), serializeMemory(list), "utf-8");
}

export async function clearMemory(): Promise<void> {
  await ensureDir();
  await fs.writeFile(memoryFile(), serializeMemory([]), "utf-8");
}

/** Dedup-merge inbound entries into disk-backed memory (restore / sync). */
export async function mergeImportedMemoryEntries(
  inbound: MemoryEntry[],
): Promise<MemoryEntry[]> {
  await ensureDir();
  if (!Array.isArray(inbound) || inbound.length === 0) {
    return await getMemory();
  }
  const merged = mergeMemorySources(await getMemory(), inbound);
  await fs.writeFile(memoryFile(), serializeMemory(merged), "utf-8");
  return merged;
}
