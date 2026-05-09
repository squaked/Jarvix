"use client";

import { splitAttachment } from "@/lib/jarvix-messages";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StreamingCursor } from "./StreamingCursor";

type Props = {
  message: Message;
  isStreaming?: boolean;
  /** When true, renders a "Regenerate" action below the bubble. */
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  speechPlain?: string;
  ttsEnabled?: boolean;
  speakingMessageId?: string | null;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
};

export function MessageBubble({
  message,
  isStreaming,
  showRegenerate,
  onRegenerate,
  speechPlain,
  ttsEnabled,
  speakingMessageId,
  onSpeak,
  onStopSpeak,
}: Props) {
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
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed"
          style={{
            background: "var(--accent)",
            color: "white",
            boxShadow: "var(--warm-shadow)",
          }}
        >
          {imageDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
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
      className="group flex flex-col items-start"
    >
      <div
        className="max-w-[82%] rounded-2xl rounded-tl-sm px-5 py-4 bg-surface border border-border"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <div className="prose-chat text-[15px] leading-relaxed text-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 font-display text-[16.5px] last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc pl-5 font-display text-[16.5px] last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 font-display text-[16.5px] last:mb-0">{children}</ol>,
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
                const match = /language-(\w+)/.exec(className || "");
                const lang = match ? match[1] : "";
                const isBlock = /language-/.test(className ?? "");
                const textContent = String(children).replace(/\n$/, "");
                return isBlock ? (
                  <div className="my-3 overflow-hidden rounded-xl border border-border bg-surface-2">
                    <div className="flex items-center justify-between bg-surface/50 px-4 py-1.5 border-b border-border text-xs text-muted">
                      <span className="font-mono uppercase">{lang || "text"}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(textContent)}
                        className="hover:text-text transition-colors flex items-center gap-1"
                        title="Copy code"
                      >
                        <CopyGlyph /> Copy
                      </button>
                    </div>
                    <code
                      className="block w-full overflow-x-auto p-4 font-mono text-[13px] text-text"
                      {...props}
                    >
                      {children}
                    </code>
                  </div>
                ) : (
                  <code
                    className="rounded-lg border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[13px]"
                    style={{ color: "var(--accent)" }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="m-0">{children}</pre>,
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

      {!isStreaming && (
        <AssistantActions
          plainText={messagePlainText(message.content)}
          speechPlain={speechPlain}
          ttsEnabled={Boolean(ttsEnabled && speechPlain?.trim())}
          isSpeaking={speakingMessageId === message.id}
          onSpeak={onSpeak}
          onStopSpeak={onStopSpeak}
          showRegenerate={Boolean(showRegenerate && onRegenerate)}
          onRegenerate={onRegenerate}
        />
      )}
    </motion.div>
  );
}

/** Strip our `![attachment](data:...)` markers so Copy yields clean prose. */
function messagePlainText(content: string): string {
  return content.replace(/!\[attachment\]\(data:[^)]+\)/g, "").trim();
}

function AssistantActions({
  plainText,
  speechPlain,
  ttsEnabled,
  isSpeaking,
  onSpeak,
  onStopSpeak,
  showRegenerate,
  onRegenerate,
}: {
  plainText: string;
  speechPlain?: string;
  ttsEnabled?: boolean;
  isSpeaking?: boolean;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
  showRegenerate: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!plainText) return;
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const canListen = Boolean(ttsEnabled && onSpeak && speechPlain?.trim());

  return (
    <div
      className={cn(
        "mt-1.5 ml-1 flex flex-wrap items-center gap-1 transition-opacity",
        "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
      )}
    >
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
        title="Copy message"
      >
        {copied ? <CheckGlyph /> : <CopyGlyph />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canListen && (
        <>
          {isSpeaking ? (
            <button
              type="button"
              onClick={() => onStopSpeak?.()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent-soft"
              title="Stop playback"
            >
              <StopTinyIcon />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSpeak?.()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
              title="Read aloud"
            >
              <PlayTinyIcon />
              Listen
            </button>
          )}
        </>
      )}
      {showRegenerate && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
          title="Regenerate response"
        >
          <RefreshGlyph />
          Regenerate
        </button>
      )}
    </div>
  );
}

function PlayTinyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="8 5 8 19 19 12 8 5" />
    </svg>
  );
}

function StopTinyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
