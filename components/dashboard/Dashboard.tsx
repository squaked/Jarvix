"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { TtsHeaderToggle } from "@/components/layout/TtsHeaderToggle";
import { VoiceOrb } from "@/components/dashboard/VoiceOrb";
import { ListeningPulseDot } from "@/components/voice/ListeningIndicator";
import { createChat, getChats } from "@/lib/storage";
import type { Chat } from "@/lib/types";
import type { RecorderState } from "@/lib/use-audio-recorder";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarWidget } from "./CalendarWidget";
import { GreetingBlock } from "./GreetingBlock";
import { DashboardBottomSection } from "./DashboardBottomSection";
import { WeatherWidget } from "./WeatherWidget";

export function Dashboard() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lastChat, setLastChat] = useState<Chat | null>(null);
  const [orbRecorderState, setOrbRecorderState] =
    useState<RecorderState>("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getChats().then(chats => setLastChat(chats[0] || null)).catch(() => {});
  }, []);

  const orbListening = orbRecorderState === "recording";
  const orbTranscribing = orbRecorderState === "transcribing";

  const startChat = useCallback(
    async (initialText?: string) => {
      if (starting) return;
      setStarting(true);
      try {
        const chat = await createChat();
        if (initialText?.trim()) {
          window.sessionStorage.setItem(
            `jarvix-prefill-${chat.id}`,
            initialText.trim(),
          );
        }
        router.push(`/chat/${chat.id}`);
      } finally {
        setStarting(false);
      }
    },
    [router, starting],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void startChat(inputValue);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg text-text">
      <AppHeader endBeforeSettings={<TtsHeaderToggle />} />

      {/* Main area */}
      <main className="flex flex-col items-center flex-1 min-h-0 px-6 pt-10 pb-6 gap-12 max-w-3xl mx-auto w-full">

        {/* Greeting + orb */}
        <div className="flex flex-col items-center gap-10 w-full">
          <GreetingBlock />

          <div className="flex flex-col items-center gap-8 w-full">
            <VoiceOrb
              className="animate-fade-up stagger-3"
              onRecorderStateChange={setOrbRecorderState}
              onTranscript={(text) => {
                setInputValue(text);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            />

            {/* Quick input */}
            <div
              className={cn(
                "w-full max-w-xl rounded-2xl border bg-surface transition-all duration-200 animate-fade-up stagger-4 overflow-hidden",
                focused && !orbListening
                  ? "border-accent/50 shadow-[0_0_0_3px_var(--accent-soft)]"
                  : orbListening
                    ? "border-accent/50 shadow-[0_0_0_2px_var(--accent-soft)]"
                    : orbTranscribing
                      ? "border-accent/35 shadow-[0_0_0_2px_var(--accent-soft)]"
                      : "border-border",
              )}
              style={{
                boxShadow:
                  focused && !orbListening
                    ? undefined
                    : orbListening || orbTranscribing
                      ? undefined
                      : "var(--card-shadow)",
              }}
            >
              {orbListening ? (
                <div
                  className="space-y-2 border-b border-accent/25 bg-accent/[0.06] px-3 py-2"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    <ListeningPulseDot />
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                      Listening
                    </span>
                    <span className="text-[11px] text-muted">
                      Tap the orb when done
                    </span>
                  </div>
                </div>
              ) : orbTranscribing ? (
                <div className="space-y-2 border-b border-accent/25 bg-accent/[0.06] px-3 py-2">
                  <span className="text-xs font-medium text-accent">
                    Transcribing…
                  </span>
                </div>
              ) : null}
              <div className="flex items-end gap-2 p-3">
                <textarea
                  ref={inputRef}
                  id="jarvix-dashboard-input"
                  rows={1}
                  value={inputValue}
                  placeholder={
                    orbListening
                      ? "Listening…"
                      : orbTranscribing
                        ? "Transcribing…"
                        : "Ask anything or tap the orb to speak…"
                  }
                  className={cn(
                    "flex-1 resize-none bg-transparent text-base text-text outline-none py-1.5 px-2 max-h-32 placeholder:text-muted",
                  )}
                  style={{ minHeight: 40 }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  disabled={!inputValue.trim() || starting}
                  onClick={() => void startChat(inputValue)}
                  className={cn(
                    "flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200",
                    inputValue.trim() && !starting
                      ? "text-white"
                      : "text-muted cursor-not-allowed opacity-50",
                  )}
                  style={
                    inputValue.trim() && !starting
                      ? {
                          background: "var(--accent)",
                          boxShadow: "0 2px 12px var(--accent-glow)",
                        }
                      : { background: "var(--surface-2)" }
                  }
                  aria-label="Send"
                >
                  <SendIcon />
                </button>
              </div>
            </div>

            {lastChat && (
              <div className="flex animate-fade-up stagger-5 -mt-3">
                <button
                  type="button"
                  onClick={() => router.push(`/chat/${lastChat.id}`)}
                  className="group flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted hover:text-text hover:border-accent/40 hover:bg-surface-2 transition-all shadow-soft"
                >
                  Continue: <span className="text-text font-medium truncate max-w-[200px]">{lastChat.title || "Recent conversation"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Widgets */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CalendarWidget />
          <WeatherWidget />
        </div>

        <DashboardBottomSection
          onQuickStart={(msg) => void startChat(msg)}
          starting={starting}
        />
      </main>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
