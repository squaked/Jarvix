"use client";

import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import type { ToolCallCardProps } from "@/components/chat/ToolCallCard";
import {
  AppHeader,
  appHeaderIconButtonClassCompact,
} from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { writeGroqQuotaToSession } from "@/lib/groq-quota-global";
import { useJarvixSettings } from "@/lib/settings";
import { appendMessagesToChat, getChat, getChats } from "@/lib/storage";
import type { Chat, Message } from "@/lib/types";
import type { GroqTranscriptionUsage } from "@/lib/transcribe-api-types";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";

type StreamChunk =
  | { type: "text"; delta?: string }
  | {
      type: "tool_call";
      tool: string;
      status: "running" | "done";
      result?: unknown;
      id?: string;
    }
  | { type: "groq_quota"; usage: GroqTranscriptionUsage }
  | { type: "done" }
  | { type: "error"; message?: string };

type ToolTracker = ToolCallCardProps & { rowKey: string };

export default function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const chatId = params.id;
  const { settings } = useJarvixSettings();

  const [chats, setChats] = useState<Chat[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refreshChats = useCallback((): Promise<void> => {
    return (async () => {
      try {
        const next = await getChats();
        startTransition(() => setChats(next));
      } catch {
        startTransition(() => setChats([]));
      }
    })();
  }, []);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [streamTools, setStreamTools] = useState<ToolTracker[]>([]);
  const [streamText, setStreamText] = useState("");
  const [streamingAssistant, setStreamingAssistant] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const chat = await getChat(chatId);
      if (!chat) {
        if (!cancelled) router.replace("/");
        return;
      }
      if (cancelled) return;

      setMessages(chat.messages);

      const rawPrefill = window.sessionStorage.getItem(
        `jarvix-prefill-${chatId}`,
      );
      if (rawPrefill !== null) {
        window.sessionStorage.removeItem(`jarvix-prefill-${chatId}`);
      }
      const prefill = rawPrefill?.trim() ?? "";

      if (prefill) {
        window.dispatchEvent(
          new CustomEvent("jarvix:prefill-input", {
            detail: { text: prefill, autoSend: true },
          }),
        );
      } else if (chat.messages.length === 0 && !cancelled) {
        router.replace("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, router]);

  const handleSend = async (
    text: string,
    attachment?: { base64: string; mimeType: string },
  ) => {
    if (streamingAssistant) return;
    setErrorBanner(null);

    const body = text.trim();
    let userContent = body;
    if (attachment?.base64 && attachment.mimeType) {
      userContent = `${body}\n\n![attachment](data:${attachment.mimeType};base64,${attachment.base64})`;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
    };

    const baseline = [...messages, userMsg];
    setMessages(baseline);
    try {
      await appendMessagesToChat(chatId, baseline);
    } catch {
      setErrorBanner("Couldn't save your message.");
      return;
    }
    void refreshChats();

    setStreamingAssistant(true);
    setStreamText("");
    setStreamTools([]);
    let assistantAccumulator = "";
    let streamRafId = 0;
    let streamErrorSummary: string | null = null;

    const settingsPayload = settings;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: baseline, settings: settingsPayload }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong — check your API key in Settings.");
      }

      reader = res.body?.getReader();
      if (!reader) throw new Error("Response stream unavailable.");

      const decoder = new TextDecoder();
      let backlog = "";

      loop: while (true) {
        const { done, value } = await reader.read();
        backlog += decoder.decode(value ?? new Uint8Array(), { stream: true });
        const segments = backlog.split("\n");
        backlog = segments.pop() ?? "";

        for (const rawLine of segments) {
          const line = rawLine.trim();
          if (!line) continue;

          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(line) as StreamChunk;
          } catch {
            continue;
          }

          if (chunk.type === "groq_quota") {
            const u = chunk.usage;
            if (u && typeof u === "object") {
              writeGroqQuotaToSession(u);
            }
          }

          if (chunk.type === "error") {
            const m = chunk.message;
            const text =
              typeof m === "string"
                ? m
                : m != null && typeof m === "object"
                  ? JSON.stringify(m)
                  : "Something went wrong.";
            const trimmed = text.trim() ? text : "Something went wrong.";
            setErrorBanner(trimmed);
            streamErrorSummary = trimmed;
          }

          if (chunk.type === "tool_call") {
            const { tool, status, id: callId } = chunk;
            if (status === "running") {
              setStreamTools((prev) => [
                ...prev,
                { tool, status: "running", rowKey: callId ?? crypto.randomUUID() },
              ]);
            } else {
              setStreamTools((prev) => {
                const next = [...prev];
                for (let i = next.length - 1; i >= 0; i--) {
                  const row = next[i];
                  if (!row || row.status !== "running") continue;
                  const matchById = callId && row.rowKey === callId;
                  const matchByTool = row.tool === tool;
                  if (matchById || (!callId && matchByTool)) {
                    next[i] = { ...row, status: "done", result: chunk.result };
                    break;
                  }
                }
                return next;
              });
            }
          }

          if (chunk.type === "text" && chunk.delta) {
            assistantAccumulator += chunk.delta;
            if (!streamRafId) {
              streamRafId = window.requestAnimationFrame(() => {
                streamRafId = 0;
                setStreamText(assistantAccumulator);
              });
            }
          }

          if (chunk.type === "done") {
            if (streamRafId) window.cancelAnimationFrame(streamRafId);
            streamRafId = 0;
            setStreamText(assistantAccumulator);
            break loop;
          }
        }

        if (done) break;
      }

      if (streamRafId) window.cancelAnimationFrame(streamRafId);
      setStreamText(assistantAccumulator);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          assistantAccumulator.trim() ||
          (streamErrorSummary
            ? `Could not finish the reply (${streamErrorSummary}). If this persists, check your connection or try again — your API key may still be fine.`
            : "(No response — check your API key in Settings.)"),
      };

      const finalMessages = [...baseline, assistantMsg];
      setMessages(finalMessages);
      setStreamingAssistant(false);
      setStreamText("");
      setStreamTools([]);

      try {
        await appendMessagesToChat(chatId, finalMessages);
      } catch {
        setErrorBanner("Couldn't save the reply.");
      }
      void refreshChats();
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : "Something interrupted the response.",
      );
    } finally {
      try { reader?.releaseLock(); } catch { /* noop */ }
      if (streamRafId) window.cancelAnimationFrame(streamRafId);
      setStreamTools([]);
      setStreamText("");
      setStreamingAssistant(false);
    }
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-text">
      <Sidebar
        chats={chats}
        mobileOpen={historyOpen}
        onMobileOpenChange={setHistoryOpen}
        onChatsChange={refreshChats}
      />

      <div className="sticky top-0 z-20 shrink-0 glass border-b border-border/50">
        <AppHeader
          compact
          endBeforeSettings={
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className={appHeaderIconButtonClassCompact}
              aria-label="Chats"
              style={{ boxShadow: "var(--warm-shadow)" }}
            >
              <ChatsIcon />
            </button>
          }
        />

        {errorBanner ? (
          <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
            {errorBanner}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden w-full max-w-3xl mx-auto px-6 pt-1">
        <div className="flex flex-1 flex-col min-h-0">
          <MessageList
            messages={messages}
            streamTools={streamTools.map((t) => ({
              tool: t.tool,
              status: t.status,
              result: t.result,
            }))}
            streamAssistantText={streamText}
            streamingAssistant={streamingAssistant}
          />
          <InputBar
            onSend={(content, attachment) => void handleSend(content, attachment)}
            streaming={streamingAssistant}
            disabled={streamingAssistant}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

function ChatsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
