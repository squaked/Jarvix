"use client";

import { chunkTextForOrpheus } from "@/lib/tts-chunk";
import type { Settings } from "@/lib/types";
import { useCallback, useRef, useState } from "react";

function playBlob(blob: Blob, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      signal.removeEventListener("abort", onAbort);
      URL.revokeObjectURL(url);
    };

    const onAbort = () => {
      try {
        audio.pause();
      } catch {
        /* noop */
      }
      cleanup();
      resolve();
    };

    signal.addEventListener("abort", onAbort);

    audio.onended = () => {
      cleanup();
      resolve();
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error("Audio playback failed"));
    };

    void audio.play().catch((e) => {
      cleanup();
      reject(e instanceof Error ? e : new Error("play() failed"));
    });
  });
}

export function useGroqTts() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (opts: {
      messageId: string;
      plainText: string;
      voice: string;
      /** Sent with each request like `/api/chat` so TTS sees the same Groq key. */
      settings: Settings;
    }) => {
      const { messageId, plainText, voice, settings } = opts;
      abortRef.current?.abort();

      const chunks = chunkTextForOrpheus(plainText);
      if (chunks.length === 0) return;

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSpeakingId(messageId);

      try {
        for (const chunk of chunks) {
          if (ctrl.signal.aborted) break;

          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunk, voice, settings }),
            signal: ctrl.signal,
          });

          if (!res.ok) {
            let msg = `TTS failed (${res.status})`;
            try {
              const err = (await res.json()) as { error?: string };
              if (typeof err.error === "string" && err.error.trim()) msg = err.error;
            } catch {
              /* noop */
            }
            throw new Error(msg);
          }

          const blob = await res.blob();
          await playBlob(blob, ctrl.signal);
          if (ctrl.signal.aborted) break;
        }
      } catch (e) {
        if (
          !(e instanceof DOMException && e.name === "AbortError") &&
          (e as { name?: string })?.name !== "AbortError"
        ) {
          console.warn(e);
        }
      } finally {
        if (abortRef.current === ctrl) {
          abortRef.current = null;
        }
        setSpeakingId((cur) => (cur === messageId ? null : cur));
      }
    },
    [],
  );

  return { speak, stop, speakingId };
}
