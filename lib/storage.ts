"use client";

import {
  mergeChatLists,
  persistAppendMessagesBrowser,
  persistChatInBrowser,
  readBrowserChats,
  removeChatFromBrowser,
  writeBrowserChats,
} from "@/lib/browser-chats-store";
import type { Chat, Message } from "./types";

export type { Chat, Message } from "./types";

const LEGACY_LS_KEYS = ["jarvix_chats"] as const;
const SESSION_MIGRATE_KEY_NEW = "jarvix_chats_migrated_from_ls";

function sessionMigrateDone(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_MIGRATE_KEY_NEW) === "1";
}

function setSessionMigrateDone() {
  sessionStorage.setItem(SESSION_MIGRATE_KEY_NEW, "1");
}

async function syncChatPostQuiet(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
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

    let raw: string | null = null;
    for (const k of LEGACY_LS_KEYS) {
      raw = localStorage.getItem(k);
      if (raw) break;
    }

    if (chatsList.length > 0) {
      for (const k of LEGACY_LS_KEYS) localStorage.removeItem(k);
      setSessionMigrateDone();
      await writeBrowserChats(mergeChatLists(await readBrowserChats(), chatsList));
      return;
    }

    if (!raw) {
      setSessionMigrateDone();
      return;
    }

    const parsed = JSON.parse(raw) as Chat[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      for (const k of LEGACY_LS_KEYS) localStorage.removeItem(k);
      setSessionMigrateDone();
      return;
    }

    const importRes = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", chats: parsed }),
    });
    if (!importRes.ok) throw new Error("import chats");

    await writeBrowserChats(mergeChatLists(await readBrowserChats(), parsed));

    for (const k of LEGACY_LS_KEYS) localStorage.removeItem(k);
    setSessionMigrateDone();
  } catch {
    /* Leave migrate unset so we retry if the network failed. */
  }
}

export async function getChats(): Promise<Chat[]> {
  await migrateLegacyChatsOnce();

  let remote: Chat[] = [];
  try {
    const res = await fetch("/api/chats");
    if (res.ok) {
      const payload = (await res.json()) as { chats?: Chat[] };
      remote = Array.isArray(payload.chats) ? payload.chats : [];
    }
  } catch {
    /* offline / server error — rely on browser */
  }

  const local = await readBrowserChats();
  const merged = mergeChatLists(remote, local);
  await writeBrowserChats(merged);
  return merged;
}

export async function getChat(id: string): Promise<Chat | undefined> {
  const fromList = await getChats();
  return fromList.find((c) => c.id === id);
}

export async function saveChat(chat: Chat): Promise<void> {
  await migrateLegacyChatsOnce();

  await persistChatInBrowser(chat);

  await syncChatPostQuiet({ action: "save", chat });
}

export async function deleteChat(id: string): Promise<void> {
  await migrateLegacyChatsOnce();

  await removeChatFromBrowser(id);

  await syncChatPostQuiet({ action: "delete", id });
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

  await persistChatInBrowser(chat);

  await syncChatPostQuiet({ action: "save", chat });

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

  const local = await persistAppendMessagesBrowser(id, messages);

  if (!local) throw new Error("Failed to persist messages");

  const ok = await syncChatPostQuiet({
    action: "append",
    id,
    messages,
  });

  if (!ok) {
    console.warn("[Jarvix] Server chat sync skipped; data kept in-browser.");
  }

  return local;
}
