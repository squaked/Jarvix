"use client";

import type { Chat, Message } from "./types";

export type { Chat, Message } from "./types";

const LEGACY_LS_KEYS = ["jarvix_chats", "jarvix_chats"] as const;
const SESSION_MIGRATE_KEY_NEW = "jarvix_chats_migrated_from_ls";
const SESSION_MIGRATE_KEY_OLD = "jarvix_chats_migrated_from_ls";

function sessionMigrateDone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    sessionStorage.getItem(SESSION_MIGRATE_KEY_NEW) === "1" ||
    sessionStorage.getItem(SESSION_MIGRATE_KEY_OLD) === "1"
  );
}

function setSessionMigrateDone() {
  sessionStorage.setItem(SESSION_MIGRATE_KEY_NEW, "1");
}

function draftChatKeys(id: string) {
  return [`jarvix_chat_draft_${id}`, `jarvix_chat_draft_${id}`] as const;
}

function persistEmptyChatDraft(chat: Chat): void {
  if (typeof window === "undefined") return;
  if (!Array.isArray(chat.messages) || chat.messages.length > 0) return;
  sessionStorage.setItem(draftChatKeys(chat.id)[0], JSON.stringify(chat));
}

function readDraftChat(id: string): Chat | undefined {
  if (typeof window === "undefined") return undefined;
  for (const key of draftChatKeys(id)) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      return JSON.parse(raw) as Chat;
    } catch {
      /* noop */
    }
  }
  return undefined;
}

function clearChatDraft(id: string): void {
  if (typeof window === "undefined") return;
  for (const key of draftChatKeys(id)) {
    sessionStorage.removeItem(key);
  }
}

async function migrateLegacyChatsOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (sessionMigrateDone()) return;

  try {
    const listRes = await fetch("/api/chats");
    if (!listRes.ok) throw new Error("chats");
    const payload = (await listRes.json()) as { chats: Chat[] };
    const chatsList = Array.isArray(payload.chats) ? payload.chats : [];

    if (chatsList.length > 0) {
      for (const k of LEGACY_LS_KEYS) {
        localStorage.removeItem(k);
      }
      setSessionMigrateDone();
      return;
    }

    let raw: string | null = null;
    for (const k of LEGACY_LS_KEYS) {
      raw = localStorage.getItem(k);
      if (raw) break;
    }
    if (!raw) {
      setSessionMigrateDone();
      return;
    }

    const parsed = JSON.parse(raw) as Chat[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      for (const k of LEGACY_LS_KEYS) {
        localStorage.removeItem(k);
      }
      setSessionMigrateDone();
      return;
    }

    const importRes = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", chats: parsed }),
    });
    if (!importRes.ok) throw new Error("import chats");
    for (const k of LEGACY_LS_KEYS) {
      localStorage.removeItem(k);
    }
    setSessionMigrateDone();
  } catch {
    /* Leave migrate unset so we retry if the network failed. */
  }
}

export async function getChats(): Promise<Chat[]> {
  await migrateLegacyChatsOnce();
  const res = await fetch("/api/chats");
  if (!res.ok) throw new Error("Failed to load chats");
  const data = (await res.json()) as { chats: Chat[] };
  return Array.isArray(data.chats) ? data.chats : [];
}

export async function getChat(id: string): Promise<Chat | undefined> {
  const fromServerList = await getChats();
  const fromServer = fromServerList.find((c) => c.id === id);
  if (fromServer) return fromServer;

  return readDraftChat(id);
}

export async function saveChat(chat: Chat): Promise<void> {
  await migrateLegacyChatsOnce();

  if (!chat.messages?.length) {
    persistEmptyChatDraft(chat);
  } else {
    clearChatDraft(chat.id);
  }

  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", chat }),
  });
  if (!res.ok) throw new Error("Failed to save chat");
}

export async function deleteChat(id: string): Promise<void> {
  await migrateLegacyChatsOnce();
  clearChatDraft(id);
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  if (!res.ok) throw new Error("Failed to delete chat");
}

export async function createChat(): Promise<Chat> {
  await migrateLegacyChatsOnce();
  const t = new Date().toISOString();
  const chat: Chat = {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: t,
    updatedAt: t,
  };
  persistEmptyChatDraft(chat);
  return chat;
}

export async function appendMessagesToChat(
  id: string,
  messages: Message[],
): Promise<Chat> {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Nothing to persist");
  }

  await migrateLegacyChatsOnce();
  clearChatDraft(id);
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "append",
      id,
      messages,
    }),
  });
  if (!res.ok) throw new Error("Failed to persist messages");
  const data = (await res.json()) as { chat?: Chat | null };
  if (!data.chat) throw new Error("Failed to persist messages");
  return data.chat;
}
