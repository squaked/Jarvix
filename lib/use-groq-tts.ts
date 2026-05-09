"use client";

import { chunkTextForOrpheus } from "@/lib/tts-chunk";
import type { Settings } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const DB_NAME = "JarvixTTSCache";
const STORE_NAME = "blobs";

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function getCachedTTS(key: string): Promise<Blob | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) return resolve(null);
        
        // Handle legacy format (raw Blob)
        if (result instanceof Blob) {
           return resolve(result);
        }

        // Handle new format with timestamp
        if (result.blob && result.timestamp) {
           const age = Date.now() - result.timestamp;
           if (age > THIRTY_DAYS_MS) {
             return resolve(null);
           }
           return resolve(result.blob);
        }

        resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function setCachedTTS(key: string, blob: Blob): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ blob, timestamp: Date.now() }, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* Ignore errors */
  }
}

async function cleanupOldTTS(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const result = cursor.value;
        if (result && result.timestamp) {
          const age = Date.now() - result.timestamp;
          if (age > THIRTY_DAYS_MS) {
            cursor.delete();
          }
        }
        cursor.continue();
      }
    };
  } catch {
    /* Ignore errors */
  }
}

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

  useEffect(() => {
    void cleanupOldTTS();
  }, []);

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

          const normalizedChunk = chunk.toLowerCase().trim().replace(/\s+/g, " ");
          const cacheKey = `${voice}:::${normalizedChunk}`;
          let blob = await getCachedTTS(cacheKey);

          if (!blob) {
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

            blob = await res.blob();
            await setCachedTTS(cacheKey, blob);
          }

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
