import { NextResponse } from "next/server";
import {
  appendMessagesToStore,
  deleteChatFromStore,
  importChatsIntoStore,
  readChatsFilePruned,
  saveChatToStore,
} from "@/lib/chats-file-store";
import type { Chat, Message } from "@/lib/types";

export async function GET() {
  const chats = await readChatsFilePruned();
  return NextResponse.json({ chats });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      chat?: Chat;
      id?: string;
      messages?: Message[];
      chats?: Chat[];
    };

    if (body.action === "save" && body.chat) {
      await saveChatToStore(body.chat);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete" && body.id) {
      await deleteChatFromStore(body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "append" && body.id && Array.isArray(body.messages)) {
      const chat = await appendMessagesToStore(body.id, body.messages as Message[]);
      return NextResponse.json({ ok: true, chat: chat ?? null });
    }

    if (
      body.action === "import" &&
      Array.isArray(body.chats) &&
      body.chats.length > 0
    ) {
      await importChatsIntoStore(body.chats);
      const chats = await readChatsFilePruned();
      return NextResponse.json({ ok: true, chats });
    }

    return NextResponse.json(
      { error: "Invalid action or missing fields" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
