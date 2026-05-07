"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { VoiceOrb } from "@/components/dashboard/VoiceOrb";
import { ListeningPulseDot } from "@/components/voice/ListeningIndicator";
import { createChat } from "@/lib/storage";
import type { RecorderState } from "@/lib/use-audio-recorder";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { CalendarWidget } from "./CalendarWidget";
import { GreetingBlock } from "./GreetingBlock";
import { DashboardBottomSection } from "./DashboardBottomSection";
import { WeatherWidget } from "./WeatherWidget";

export function Dashboard() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [starting, setStarting] = useState(false);
  const [orbRecorderState, setOrbRecorderState] =
    useState<RecorderState>("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      <AppHeader />

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
