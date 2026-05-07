"use client";

import { mergeRemoteMemory } from "./browser-memory-store";
import {
  mergeChatLists,
  readBrowserChats,
  writeBrowserChats,
} from "./browser-chats-store";
import { readSettingsMirror } from "./client-settings-cache";
import { fetchMemories, pushMemoryMergeToServer } from "./memory-client";
import { flushChatsToServerQuiet, getChats } from "./storage";
import type { Chat, MemoryEntry, Message, Settings } from "./types";

export const JARVIX_BACKUP_VERSION = 1 as const;

export type JarvixBackupPayload = {
  jarvixBackupVersion: typeof JARVIX_BACKUP_VERSION;
  exportedAt: string;
  chats: Chat[];
  memories: MemoryEntry[];
  settings?: Partial<Settings>;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function sanitizeMessages(raw: unknown): Message[] {
  if (!Array.isArray(raw)) return [];
  const out: Message[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    if (typeof x.id !== "string" || typeof x.content !== "string") continue;
    const role = x.role;
    if (
      role !== "user" &&
      role !== "assistant" &&
      role !== "system" &&
      role !== "tool"
    ) {
      continue;
    }
    out.push({
      id: x.id,
      role,
      content: x.content,
      toolName:
        typeof x.toolName === "string" ? x.toolName : undefined,
      toolCallId:
        typeof x.toolCallId === "string" ? x.toolCallId : undefined,
    });
  }
  return out;
}

export function sanitizeChats(raw: unknown): Chat[] {
  if (!Array.isArray(raw)) return [];
  const out: Chat[] = [];
  const t = new Date().toISOString();
  for (const x of raw) {
    if (!isRecord(x)) continue;
    if (typeof x.id !== "string") continue;
    out.push({
      id: x.id,
      title: typeof x.title === "string" ? x.title : "Chat",
      messages: sanitizeMessages(x.messages),
      createdAt:
        typeof x.createdAt === "string" ? x.createdAt : t,
      updatedAt:
        typeof x.updatedAt === "string" ? x.updatedAt : t,
    });
  }
  return out;
}

export function sanitizeMemories(raw: unknown): MemoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryEntry[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    if (
      typeof x.id !== "string" ||
      typeof x.fact !== "string" ||
      typeof x.createdAt !== "string"
    ) {
      continue;
    }
    out.push({ id: x.id, fact: x.fact, createdAt: x.createdAt });
  }
  return out;
}



export type ParseJarvixBackupResult =
  | { ok: true; data: JarvixBackupPayload }
  | { ok: false; error: string };

export function parseJarvixBackupFile(raw: unknown): ParseJarvixBackupResult {
  if (!isRecord(raw)) return { ok: false, error: "Backup must be a JSON object." };

  const v = raw.jarvixBackupVersion;
  if (v !== JARVIX_BACKUP_VERSION) {
    return { ok: false, error: `Unsupported jarvixBackupVersion (expected ${JARVIX_BACKUP_VERSION}).` };
  }

  const exportedAt =
    typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString();

  const chats = sanitizeChats(raw.chats);
  const memories = sanitizeMemories(raw.memories);

  let settingsPatch: Partial<Settings> | undefined;
  if (
    raw.settings !== undefined &&
    isRecord(raw.settings)
  ) {
    settingsPatch = raw.settings as Partial<Settings>;
  }

  return {
    ok: true,
    data: {
      jarvixBackupVersion: JARVIX_BACKUP_VERSION,
      exportedAt,
      chats,
      memories,
      settings: settingsPatch,
    },
  };
}


export async function buildJarvixBackupPayload(
  includeSettings: boolean,
): Promise<JarvixBackupPayload> {
  const [chats, memories] = await Promise.all([getChats(), fetchMemories()]);
  const payload: JarvixBackupPayload = {
    jarvixBackupVersion: JARVIX_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    chats,
    memories,
  };
  if (includeSettings) {
    const s = readSettingsMirror();
    if (s) payload.settings = s;
  }
  return payload;
}

export function downloadJarvixBackupJson(payload: JarvixBackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const slug = payload.exportedAt.slice(0, 10).replace(/\//g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `jarvix-backup-${slug}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Merge backup into IndexedDB/local caches and best-effort push to `/api/chats`
 * and `/api/memory` when a server exists.
 */
export async function restoreJarvixBackupMerge(
  payload: JarvixBackupPayload,
): Promise<void> {
  const chats = sanitizeChats(payload.chats);
  const memories = sanitizeMemories(payload.memories);

  await writeBrowserChats(mergeChatLists(await readBrowserChats(), chats));
  await mergeRemoteMemory(memories);

  await flushChatsToServerQuiet(chats);
  await pushMemoryMergeToServer(memories);
}
