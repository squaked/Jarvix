"use client";

import { MicrophoneIcon } from "@/components/icons/MicrophoneIcon";
import { useJarvixSettings } from "@/components/providers/JarvixSettingsProvider";
import {
  ListeningPulseDot,
  VoiceLevelMeter,
} from "@/components/voice/ListeningIndicator";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const PLACEHOLDERS = [
  "Ask anything…",
  "What's on my calendar today?",
  "Remind me to call back tomorrow",
  "What's the weather like?",
  "Search the web for…",
];

type Props = {
  onSend: (
    content: string,
    attachment?: { base64: string; mimeType: string },
  ) => void;
  disabled?: boolean;
  streaming?: boolean;
  /** Sit inside the dashboard / chat shell without floating dock chrome. */
  embedded?: boolean;
};

export function InputBar({
  onSend,
  disabled = false,
  streaming = false,
  embedded = false,
}: Props) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { settings } = useJarvixSettings();

  const {
    state: recorderState,
    audioLevel,
    toggle: toggleRecording,
  } = useAudioRecorder({
    settings,
    onTranscript: (text) => {
      setValue((prev) => (prev ? `${prev} ${text}` : text));
      requestAnimationFrame(() => {
        resize();
        taRef.current?.focus();
      });
    },
  });

  const recording = recorderState === "recording";
  const transcribing = recorderState === "transcribing";
  const recorderError = recorderState === "error";

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        taRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; autoSend?: boolean }>)
        .detail;
      const text = typeof detail?.text === "string" ? detail.text : "";
      if (!text) return;
      const wait = disabled || streaming;
      if (detail?.autoSend && text.trim() && !wait) {
        setValue("");
        onSend(text.trim());
        requestAnimationFrame(() => resize());
        return;
      }
      setValue(text);
      requestAnimationFrame(() => {
        resize();
        taRef.current?.focus();
      });
    };
    window.addEventListener("jarvix:prefill-input", onPrefill);
    return () => window.removeEventListener("jarvix:prefill-input", onPrefill);
  }, [resize, onSend, disabled, streaming]);

  const busy = disabled || streaming;
  const canSend = Boolean(value.trim()) && !busy;

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    setValue("");
    onSend(text);
    requestAnimationFrame(() => resize());
  };

  const micScale = recording ? 1 + audioLevel * 0.3 : 1;

  const micAriaLabel = recording
    ? "Stop recording"
    : transcribing
      ? "Transcribing…"
      : recorderError
        ? "Microphone error — tap to retry"
        : "Record voice message";

  return (
    <div
      className={cn(
        embedded
          ? "shrink-0 pb-safe-6 pb-5 pt-2"
          : "glass-heavy border-t border-border/40 pb-safe-6 pb-6 pt-3",
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col",
          embedded ? "max-w-none px-0" : "max-w-2xl px-4",
        )}
      >
        <AnimatePresence mode="wait">
          {recording ? (
            <motion.div
              key="listening-banner"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2.5 overflow-hidden px-1"
            >
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  "border-accent/35 bg-accent/[0.06]",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ListeningPulseDot />
                    <span className="text-sm font-semibold uppercase tracking-wide text-accent">
                      Listening
                    </span>
                    <span className="hidden text-xs text-muted sm:inline">
                      Tap the mic to stop
                    </span>
                  </div>
                </div>
                <VoiceLevelMeter level={audioLevel} className="mt-2.5" />
              </div>
            </motion.div>
          ) : transcribing ? (
            <motion.div
              key="transcribing-banner"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2.5 overflow-hidden px-1"
            >
              <div className="rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="block h-4 w-4 shrink-0 rounded-full border-2 border-accent/30 border-t-accent"
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.75,
                      ease: "linear",
                    }}
                  />
                  <span className="text-sm font-medium text-accent">
                    Transcribing…
                  </span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-surface transition-all duration-200",
            focused && !recording
              ? "border-accent/40 shadow-[0_0_0_3px_var(--accent-soft)]"
              : recording
                ? "border-accent/50 shadow-[0_0_0_2px_var(--accent-soft)]"
                : transcribing
                  ? "border-accent/35 shadow-[0_0_0_2px_var(--accent-soft)]"
                  : "border-border",
          )}
          style={{
            boxShadow:
              focused && !recording
                ? undefined
                : recording || transcribing
                  ? undefined
                  : "var(--card-shadow)",
          }}
        >
          <motion.button
            type="button"
            disabled={busy && !recording}
            aria-label={micAriaLabel}
            aria-busy={transcribing}
            title={micAriaLabel}
            animate={{ scale: micScale }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => {
              void toggleRecording();
            }}
            className={cn(
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-colors",
              recording && "text-accent",
              !recording &&
                (recorderError
                  ? "text-red-400"
                  : transcribing
                    ? "text-accent/60"
                    : "text-muted hover:text-accent"),
              busy && !recording && "pointer-events-none opacity-40",
            )}
          >
            {transcribing ? (
              <motion.span
                className="block h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  ease: "linear",
                }}
              />
            ) : recording ? (
              <StopDot />
            ) : recorderError ? (
              <MicrophoneIcon
                size={20}
                useAccentColor={false}
                className="text-red-400"
              />
            ) : (
              <MicrophoneIcon
                size={20}
                useAccentColor={false}
                className="text-current"
              />
            )}
          </motion.button>

          <textarea
            ref={taRef}
            id="jarvix-chat-input"
            rows={1}
            value={value}
            placeholder={
              recording
                ? "Listening…"
                : transcribing
                  ? "Transcribing…"
                  : PLACEHOLDERS[placeholderIndex]
            }
            disabled={busy}
            onChange={(e) => {
              setValue(e.target.value);
              resize();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className={cn(
              "flex-1 min-h-[44px] max-h-[144px] resize-none bg-transparent py-3 text-[15px] text-text outline-none placeholder:text-muted",
              busy && "opacity-50",
            )}
          />

          <div className="flex items-end p-2">
            <button
              type="button"
              disabled={!canSend}
              onClick={submit}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0",
                canSend ? "text-white" : "text-muted cursor-not-allowed opacity-40",
              )}
              style={
                canSend
                  ? {
                      background: "var(--accent)",
                      boxShadow: "0 2px 12px var(--accent-glow)",
                    }
                  : { background: "var(--surface-2)" }
              }
              aria-label="Send"
            >
              {streaming ? (
                <motion.span
                  className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: "linear",
                  }}
                />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StopDot() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ color: "var(--accent)" }}
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
