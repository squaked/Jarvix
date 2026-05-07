import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Chat, Message } from "./types";
import { getJarvixProjectDataDir } from "./project-data-dir";

function chatsPath() {
  return path.join(getJarvixProjectDataDir(), "chats.json");
}

async function ensureDir() {
  await fs.mkdir(getJarvixProjectDataDir(), { recursive: true, mode: 0o700 });
}

export async function readChatsFile(): Promise<Chat[]> {
  try {
    const raw = await fs.readFile(chatsPath(), "utf-8");
    const data = JSON.parse(raw) as Chat[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Drops empty chats from disk and returns chats that have ≥1 message. */
export async function readChatsFilePruned(): Promise<Chat[]> {
  let chats = await readChatsFile();
  const nonEmpty = chats.filter(
    (c) => Array.isArray(c.messages) && c.messages.length > 0,
  );
  if (nonEmpty.length !== chats.length) {
    await ensureDir();
    await writeChatsFile(nonEmpty);
  }
  return nonEmpty;
}

async function writeChatsFile(chats: Chat[]) {
  await ensureDir();
  await fs.writeFile(chatsPath(), JSON.stringify(chats, null, 2), "utf-8");
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

export async function saveChatToStore(chat: Chat): Promise<void> {
  let chats = await readChatsFile();
  chats = chats.filter((c) => c.id !== chat.id);

  if (!Array.isArray(chat.messages) || chat.messages.length === 0) {
    await ensureDir();
    await writeChatsFile(chats);
    return;
  }

  chats.unshift({ ...chat, updatedAt: nowISO() });
  await writeChatsFile(chats);
}

export async function deleteChatFromStore(id: string): Promise<void> {
  const chats = (await readChatsFile()).filter((c) => c.id !== id);
  await writeChatsFile(chats);
}

export async function appendMessagesToStore(
  id: string,
  messages: Message[],
): Promise<Chat | undefined> {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;

  const chats = await readChatsFile();
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
  await saveChatToStore(next);
  return next;
}

export async function importChatsIntoStore(chats: Chat[]): Promise<void> {
  const inbound = chats.filter(
    (c): c is Chat =>
      Boolean(c?.id && Array.isArray(c.messages) && c.messages.length > 0),
  );
  if (inbound.length === 0) return;
  const existing = await readChatsFile();
  const seen = new Set(existing.map((c) => c.id));
  const merged = [...existing];
  for (const c of inbound) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    merged.push(c);
  }
  merged.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  await writeChatsFile(merged);
}
