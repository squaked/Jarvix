"use client";

import type { Message } from "@/lib/types";
import { markdownToPlainSpeech } from "@/lib/markdown-plain-speech";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ToolCallCardProps } from "./ToolCallCard";
import { ToolCallCard } from "./ToolCallCard";
import { StreamingCursor } from "./StreamingCursor";

type Props = {
  messages: Message[];
  streamTools?: ToolCallCardProps[];
  streamAssistantText?: string;
  streamingAssistant?: boolean;
  /** Called when the user clicks "Regenerate" on the last assistant turn. */
  onRegenerate?: () => void;
  /** Called when the user clicks an empty-state suggestion. */
  onSuggestion?: (text: string) => void;
  ttsEnabled?: boolean;
  speakingMessageId?: string | null;
  onSpeakAssistant?: (messageId: string, markdown: string) => void;
  onStopSpeak?: () => void;
};

const EMPTY_SUGGESTIONS = [
  "What's on my calendar today?",
  "What's the weather like?",
  "Search the web for the latest AI news",
  "Help me draft a quick reply to a friend",
] as const;

export function MessageList({
  messages,
  streamTools = [],
  streamAssistantText = "",
  streamingAssistant = false,
  onRegenerate,
  onSuggestion,
  ttsEnabled,
  speakingMessageId,
  onSpeakAssistant,
  onStopSpeak,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamTools, streamAssistantText, streamingAssistant]);

  const showStreamBlock =
    streamTools.length > 0 ||
    streamAssistantText.length > 0 ||
    streamingAssistant;

  const hasContent = messages.length > 0 || showStreamBlock;

  if (!hasContent) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="text-sm font-medium text-muted">
            What can Jarvix help with?
          </p>
          {onSuggestion ? (
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {EMPTY_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSuggestion(s)}
                  className={cn(
                    "rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-text transition-all",
                    "hover:border-accent/40 hover:bg-surface-2 hover:shadow-soft",
                  )}
                  style={{ boxShadow: "var(--card-shadow)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted/80">
            Tip: press <kbd className="rounded border border-border bg-surface-2 px-1 py-0.5 text-[11px]">⌘K</kbd> anywhere to focus the input.
          </p>
        </div>
        <div ref={bottomRef} aria-hidden />
      </div>
    );
  }

  // Find the index of the last assistant message so we can show "Regenerate".
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            showRegenerate={
              !streamingAssistant &&
              i === lastAssistantIdx &&
              m.role === "assistant"
            }
            onRegenerate={onRegenerate}
            speechPlain={
              m.role === "assistant"
                ? markdownToPlainSpeech(m.content)
                : undefined
            }
            ttsEnabled={ttsEnabled}
            speakingMessageId={speakingMessageId}
            onSpeak={
              m.role === "assistant" && onSpeakAssistant
                ? () => onSpeakAssistant(m.id, m.content)
                : undefined
            }
            onStopSpeak={onStopSpeak}
          />
        ))}

        {showStreamBlock ? (
          <div className="flex flex-col gap-2">
            {streamTools.map((t, ti) => (
              <ToolCallCard
                key={`${t.tool}-${ti}-${t.status}`}
                tool={t.tool}
                status={t.status}
                result={t.result}
              />
            ))}

            {(streamAssistantText.length > 0 || streamingAssistant) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex justify-start"
              >
                <div
                  className="max-w-[82%] rounded-2xl rounded-tl-sm px-5 py-4 bg-surface border border-border"
                  style={{ boxShadow: "var(--card-shadow)" }}
                >
                  <div className="text-[15px] leading-relaxed text-text whitespace-pre-wrap">
                    {streamAssistantText}
                    {streamingAssistant ? <StreamingCursor /> : null}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
