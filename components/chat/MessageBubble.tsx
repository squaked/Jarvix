"use client";

import { splitAttachment } from "@/lib/jarvix-messages";
import type { Message } from "@/lib/types";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamingCursor } from "./StreamingCursor";

type Props = {
  message: Message;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming }: Props) {
  if (message.role === "system") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center text-xs text-muted py-1"
      >
        {message.content}
      </motion.p>
    );
  }

  if (message.role === "user") {
    const { text: userTextRaw, imageDataUrl } = splitAttachment(message.content);
    const parts: string[] = [];
    const t = userTextRaw.trim();
    if (t) parts.push(t);
    const userDisplay = parts.join("\n\n") || message.content;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end"
      >
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed text-text border border-border"
          style={{
            background: "var(--surface-2)",
            boxShadow: "var(--warm-shadow)",
          }}
        >
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Attachment"
              className="mb-2 max-h-48 w-auto rounded-xl object-cover"
            />
          )}
          <p className="whitespace-pre-wrap">{userDisplay}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-start"
    >
      <div
        className="max-w-[82%] rounded-2xl rounded-tl-sm px-5 py-4 bg-surface border border-border"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <div className="prose-chat text-[15px] leading-relaxed text-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
              em: ({ children }) => <em className="italic opacity-90">{children}</em>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="underline underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}
                  target="_blank"
                  rel="noreferrer"
                >
                  {children}
                </a>
              ),
              code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
                const isBlock = /language-/.test(className ?? "");
                return isBlock ? (
                  <code
                    className="block w-full overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-sm text-text my-3"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="rounded-lg border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-sm"
                    style={{ color: "var(--accent)" }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
              h1: ({ children }) => (
                <h1
                  className="mb-4 font-display text-xl font-medium text-text border-b border-border pb-2"
                  style={{ fontVariationSettings: '"opsz" 24' }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  className="mb-3 font-display text-lg font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 20' }}
                >
                  {children}
                </h2>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 pl-4 italic text-muted my-4 py-1" style={{ borderColor: "var(--accent)" }}>
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming ? <StreamingCursor /> : null}
        </div>
      </div>
    </motion.div>
  );
}
