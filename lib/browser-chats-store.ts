"use client";

import type { Chat, Message } from "./types";
import { readJarvixKey, jarvixIdbUsable, writeJarvixKey } from "./idb-kv";

const IDB_CHATS_KEY = "jarvix_chats_v1";
/** Legacy single-key mirrors (migration). */
const LS_CHATS_FALLBACK_KEY = "jarvix_chats_v1_fallback";

export function normalizeChatInput(c: Chat): Chat {
  const messages = Array.isArray(c.messages) ? c.messages : [];
  const createdAt = c.createdAt || new Date().toISOString();
  const updatedAt = c.updatedAt || createdAt;
  return {
    id: String(c.id),
    title: c.title ?? "Chat",
    messages,
    createdAt,
    updatedAt,
  };
}

/** Merge lists by chat id keeping the newer updatedAt (ties favour longer transcripts). */
export function mergeChatLists(a: Chat[], b: Chat[]): Chat[] {
  const map = new Map<string, Chat>();
  for (const raw of [...a, ...b]) {
    const c = normalizeChatInput(raw);
    const prev = map.get(c.id);
    if (!prev) {
      map.set(c.id, c);
      continue;
    }
    const ta = Date.parse(prev.updatedAt);
    const tb = Date.parse(c.updatedAt);
    if (tb > ta) map.set(c.id, c);
    else if (
      tb === ta &&
      c.messages &&
      prev.messages &&
      c.messages.length > prev.messages.length
    ) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values()).sort(
    (x, y) => Date.parse(y.updatedAt) - Date.parse(x.updatedAt),
  );
}

function parseStoredChats(raw: unknown): Chat[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is Chat =>
      typeof c === "object" &&
      c !== null &&
      "id" in c &&
      typeof (c as Chat).id === "string",
  ) as Chat[];
}

function writeLocalFallback(chats: Chat[]): void {
  try {
    localStorage.setItem(LS_CHATS_FALLBACK_KEY, JSON.stringify(chats));
  } catch {
    /* quota / private mode */
  }
}

function readLocalFallback(): Chat[] | undefined {
  const raw = localStorage.getItem(LS_CHATS_FALLBACK_KEY);
  if (!raw) return undefined;
  try {
    return parseStoredChats(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export async function readBrowserChats(): Promise<Chat[]> {
  /** Merge IDB + localStorage so data survives mixed write failures (IDB ok but write threw → LS-only, etc.). */
  let fromIdb: Chat[] = [];
  try {
    if (await jarvixIdbUsable()) {
      const raw = await readJarvixKey(IDB_CHATS_KEY);
      fromIdb = parseStoredChats(raw).map(normalizeChatInput);
    }
  } catch {
    /* noop */
  }
  let fromLs: Chat[] = [];
  try {
    const ls = readLocalFallback();
    if (ls) fromLs = ls.map(normalizeChatInput);
  } catch {
    /* noop */
  }
  return mergeChatLists(fromIdb, fromLs);
}

export async function writeBrowserChats(chats: Chat[]): Promise<void> {
  const normalized = chats.map(normalizeChatInput);
  writeLocalFallback(normalized);
  try {
    if (await jarvixIdbUsable()) {
      await writeJarvixKey(IDB_CHATS_KEY, normalized);
    }
  } catch {
    /* localStorage already has the canonical copy */
  }
}

function nowISO() {
  return new Date().toISOString();
}

function titleFromFirstUserMessage(messages: Message[]) {
  const first = messages.find((m) => m.role === "user");
  if (!first?.content) return "New chat";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

/** Mirror of server saveChat rules (empty chat removed from persisted list except we keep drafts via separate path — empty handling in storage.ts calls this selectively). */
export async function persistChatInBrowser(chat: Chat): Promise<void> {
  let chats = await readBrowserChats();
  chats = chats.filter((c) => c.id !== chat.id);
  const c = normalizeChatInput(chat);
  if (c.messages?.length === 0) {
    chats.unshift({ ...c, updatedAt: c.updatedAt || nowISO() });
  } else {
    chats.unshift({ ...c, updatedAt: nowISO() });
  }
  await writeBrowserChats(chats);
}

/** Remove persisted non-empty chats with this id / clear empty draft if present */
export async function removeChatFromBrowser(id: string): Promise<void> {
  const chats = (await readBrowserChats()).filter((c) => c.id !== id);
  await writeBrowserChats(chats);
}

export async function persistAppendMessagesBrowser(
  id: string,
  messages: Message[],
): Promise<Chat | undefined> {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const chats = await readBrowserChats();
  const existing = chats.find((c) => c.id === id);
  const t = nowISO();
  const next: Chat = existing
    ? {
        ...existing,
        messages,
        title: titleFromFirstUserMessage(messages),
        updatedAt: t,
      }
    : {
        id,
        title: titleFromFirstUserMessage(messages),
        messages,
        createdAt: t,
        updatedAt: t,
      };
  await persistChatInBrowser(next);
  return next;
}
