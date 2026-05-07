"use client";

import type { Message } from "@/lib/types";
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
};

export function MessageList({
  messages,
  streamTools = [],
  streamAssistantText = "",
  streamingAssistant = false,
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
    return <div ref={bottomRef} className="flex-1 min-h-0" aria-hidden />;
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
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
