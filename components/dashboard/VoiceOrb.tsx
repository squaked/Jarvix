"use client";

import { MicrophoneIcon } from "@/components/icons/MicrophoneIcon";
import { useJarvixSettings } from "@/components/providers/JarvixSettingsProvider";
import {
  ListeningPulseDot,
  VoiceLevelMeter,
} from "@/components/voice/ListeningIndicator";
import { useAudioRecorder, type RecorderState } from "@/lib/use-audio-recorder";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  variant?: "default" | "compact";
  /**
   * Called with the transcribed text once ready.
   * When omitted, the text is broadcast via the `jarvix:prefill-input` event
   * so any mounted InputBar or dashboard input picks it up automatically.
   */
  onTranscript?: (text: string) => void;
  /** Fires whenever idle / recording / transcribing / error changes (for surrounding UI). */
  onRecorderStateChange?: (state: RecorderState) => void;
};

export function VoiceOrb({
  className,
  variant = "default",
  onTranscript,
  onRecorderStateChange,
}: Props) {
  const { settings } = useJarvixSettings();
  const compact = variant === "compact";
  const onRecorderStateChangeRef = useRef(onRecorderStateChange);
  onRecorderStateChangeRef.current = onRecorderStateChange;

  const ring3 = compact ? 200 : 280;
  const ring2 = compact ? 160 : 224;
  const ring1 = compact ? 126 : 176;
  const btn = compact ? 88 : 120;
  const mic = compact ? 22 : 28;
  const breatheInset = compact ? "0.65rem" : "0.75rem";

  const handleTranscript = (text: string) => {
    if (onTranscript) {
      onTranscript(text);
    } else {
      window.dispatchEvent(
        new CustomEvent("jarvix:prefill-input", { detail: { text } }),
      );
    }
  };

  const { state, audioLevel, toggle } = useAudioRecorder({
    settings,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    onRecorderStateChangeRef.current?.(state);
  }, [state]);

  const recording = state === "recording";
  const transcribing = state === "transcribing";
  const error = state === "error";

  const levelScale = recording ? 1 + audioLevel * 0.4 : 1;

  const ariaLabel = recording
    ? "Stop recording"
    : transcribing
      ? "Transcribing…"
      : error
        ? "Microphone error — tap to retry"
        : "Record voice message";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-5",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Ring 3 — outermost */}
        <motion.div
          className="absolute rounded-full"
          animate={{ scale: levelScale, opacity: recording ? 0.8 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{
            width: ring3,
            height: ring3,
            background: recording
              ? "radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%)"
              : "radial-gradient(circle, var(--orb-ring) 0%, transparent 70%)",
            ...(recording ? {} : { animation: "ring3 6s ease-in-out infinite" }),
          }}
        />

        {/* Ring 2 */}
        <motion.div
          className="absolute rounded-full"
          animate={{ scale: recording ? levelScale * 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{
            width: ring2,
            height: ring2,
            background: recording
              ? "radial-gradient(circle, color-mix(in srgb, var(--accent) 38%, transparent) 20%, transparent 80%)"
              : "radial-gradient(circle, var(--orb-ring) 20%, transparent 80%)",
            ...(recording ? {} : { animation: "ring2 5s ease-in-out infinite" }),
          }}
        />

        {/* Ring 1 — innermost halo */}
        <div
          className="animate-ring-1 absolute rounded-full"
          style={{
            width: ring1,
            height: ring1,
            background:
              "radial-gradient(circle, var(--accent-soft) 0%, transparent 75%)",
          }}
        />

        <motion.button
          type="button"
          aria-label={ariaLabel}
          aria-busy={transcribing}
          className={cn(
            "relative z-10 flex items-center justify-center rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
            recording &&
              "ring-[3px] ring-red-500/50 ring-offset-[3px] ring-offset-bg shadow-[0_0_32px_rgba(239,68,68,0.35)]",
          )}
          style={{
            width: btn,
            height: btn,
            background: recording
              ? "radial-gradient(circle at 38% 35%, color-mix(in srgb, var(--accent) 55%, var(--orb-inner)) 0%, color-mix(in srgb, var(--accent) 18%, var(--surface)) 100%)"
              : error
                ? "radial-gradient(circle at 38% 35%, color-mix(in srgb, #ef4444 30%, var(--orb-inner)) 0%, color-mix(in srgb, #ef4444 8%, var(--surface)) 100%)"
                : "radial-gradient(circle at 38% 35%, var(--orb-inner) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface)) 100%)",
            boxShadow: recording
              ? "0 0 72px var(--accent-glow), 0 0 4px var(--border), inset 0 1px 0 rgba(255,255,255,0.10)"
              : "0 0 48px var(--accent-glow), 0 0 2px var(--border), inset 0 1px 0 rgba(255,255,255,0.08)",
            border:
              "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
          }}
          whileHover={{ scale: transcribing ? 1 : 1.06 }}
          whileTap={{ scale: transcribing ? 1 : 0.95 }}
          onClick={() => {
            void toggle();
          }}
        >
          <div
            className="animate-orb-breathe absolute rounded-full"
            style={{
              top: breatheInset,
              left: breatheInset,
              right: breatheInset,
              bottom: breatheInset,
              background:
                "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10">
            {transcribing ? (
              <motion.span
                className="block rounded-full border-2 border-accent/30 border-t-accent"
                style={{ width: mic, height: mic }}
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  ease: "linear",
                }}
              />
            ) : recording ? (
              <StopIcon size={mic} />
            ) : error ? (
              <ErrorIcon size={mic} />
            ) : (
              <MicrophoneIcon size={mic} />
            )}
          </div>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {recording ? (
          <motion.div
            key="listening"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex w-full max-w-xs flex-col items-center gap-3 text-center",
            )}
          >
            <div className="flex items-center gap-2">
              <ListeningPulseDot />
              <span
                className={cn(
                  "font-semibold uppercase tracking-wide text-red-400",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                Listening
              </span>
            </div>
            <VoiceLevelMeter
              level={audioLevel}
              className={compact ? "max-w-[160px]" : "max-w-[220px]"}
            />
            <p
              className={cn(
                "text-muted leading-snug",
                compact ? "text-[11px] px-1" : "text-xs px-2",
              )}
            >
              Microphone is on. Tap the orb again when you are finished speaking.
            </p>
          </motion.div>
        ) : transcribing ? (
          <motion.div
            key="transcribing"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex items-center gap-2 text-accent">
              <motion.span
                className="block h-4 w-4 rounded-full border-2 border-accent/30 border-t-accent"
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  ease: "linear",
                }}
              />
              <span
                className={cn(
                  "font-medium",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                Transcribing…
              </span>
            </div>
            <p className="text-[11px] text-muted px-2 max-w-xs">
              Converting speech to text.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StopIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ color: "var(--accent)" }}
    >
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2.5"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  );
}

function ErrorIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      style={{ color: "#ef4444" }}
    >
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
