"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroqTranscriptionUsage, TranscribeApiResponse } from "./transcribe-api-types";
import { writeGroqQuotaToSession } from "./groq-quota-global";
import type { Settings } from "./types";

export type RecorderState = "idle" | "recording" | "transcribing" | "error";

type Options = {
  settings: Settings;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  /** Hard cap on recording duration in ms. Defaults to 60 s. */
  maxDurationMs?: number;
};

const DEFAULT_MAX_DURATION_MS = 60_000;
/** Minimum audio blob size to attempt transcription (avoid empty clips). */
const MIN_BLOB_SIZE_BYTES = 1_000;
/** Audio level update rate cap in ms (≈20 fps — enough for smooth visual). */
const LEVEL_UPDATE_INTERVAL_MS = 50;

function pickBestMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const MAX_RATE_LIMIT_RETRIES = 3;

function sleep(ms: number) {
  return new Promise<void>((r) => {
    window.setTimeout(r, ms);
  });
}

function retryAfterMsFromResponse(
  res: Response,
  body: TranscribeApiResponse,
): number | null {
  const fromJson = body.usage?.retryAfterSeconds;
  if (fromJson != null && Number.isFinite(fromJson) && fromJson >= 0) {
    return Math.min(fromJson * 1000 + Math.random() * 300, 120_000);
  }
  const h = res.headers.get("retry-after");
  if (h != null) {
    const s = Number.parseInt(h, 10);
    if (Number.isFinite(s) && s >= 0)
      return Math.min(s * 1000 + Math.random() * 300, 120_000);
  }
  return null;
}

function isEmptyUsage(u: GroqTranscriptionUsage | undefined): boolean {
  if (!u) return true;
  return Object.values(u).every((v) => v === undefined || v === null || v === "");
}

/** Fully stop all tracks and close the AudioContext, waiting for close to settle. */
async function shutdownStream(
  stream: MediaStream | null,
  ctx: AudioContext | null,
  animFrame: number,
): Promise<void> {
  cancelAnimationFrame(animFrame);
  stream?.getTracks().forEach((t) => t.stop());
  if (ctx && ctx.state !== "closed") {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

export function useAudioRecorder({
  settings,
  onTranscript,
  onError,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
}: Options) {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  /** Last Groq rate-limit snapshot from `/api/transcribe` (success or error). */
  const [lastUsage, setLastUsage] = useState<GroqTranscriptionUsage | null>(
    null,
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const levelTimestampRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  /** Must be reset on every mount — cleanup sets false; Strict Mode remount leaves refs stale otherwise. */
  const mountedRef = useRef(true);
  const stateRef = useRef<RecorderState>(state);
  stateRef.current = state;

  /**
   * Guards against concurrent start() invocations while getUserMedia is
   * pending (the button could be clicked multiple times before the Promise
   * resolves, since stateRef is still "idle" during the async call).
   */
  const startingRef = useRef(false);

  // Stable refs so callbacks never need to be in dep arrays
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const settingsRef = useRef(settings);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // ── Audio level monitoring ───────────────────────────────────────────────

  const stopLevelMonitor = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    if (mountedRef.current) setAudioLevel(0);
  }, []);

  const startLevelMonitor = useCallback(
    (stream: MediaStream) => {
      try {
        // Reuse existing context if still open (avoids duplicate AudioContexts)
        let ctx = audioCtxRef.current;
        if (!ctx || ctx.state === "closed") {
          ctx = new AudioContext();
          audioCtxRef.current = ctx;
        } else if (ctx.state === "suspended") {
          void ctx.resume();
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);

        const bin = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(bin);
          const now = performance.now();
          if (now - levelTimestampRef.current >= LEVEL_UPDATE_INTERVAL_MS) {
            levelTimestampRef.current = now;
            const rms =
              Math.sqrt(bin.reduce((s, v) => s + v * v, 0) / bin.length) / 128;
            if (mountedRef.current) setAudioLevel(Math.min(rms, 1));
          }
          animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
      } catch {
        // Level monitoring is purely cosmetic; ignore errors
      }
    },
    [],
  );

  // ── Stream / recorder cleanup ────────────────────────────────────────────

  /**
   * Release all media resources. Returns a Promise so callers that need to
   * wait for the AudioContext to fully close before opening a new stream can
   * await it (prevents the mic staying "in use" between sessions).
   */
  const releaseStream = useCallback(async () => {
    clearTimeout(autoStopTimerRef.current);
    stopLevelMonitor();

    const stream = streamRef.current;
    const ctx = audioCtxRef.current;
    const frame = animFrameRef.current;

    streamRef.current = null;
    audioCtxRef.current = null;
    animFrameRef.current = 0;

    await shutdownStream(stream, ctx, frame);
  }, [stopLevelMonitor]);

  // ── Transcription ────────────────────────────────────────────────────────

  const transcribe = useCallback(async (blob: Blob) => {
    if (!mountedRef.current) return;
    setState("transcribing");

    const postOnce = async () => {
      const form = new FormData();
      const ext =
        blob.type.includes("ogg")
          ? "ogg"
          : blob.type.includes("mp4") || blob.type.includes("m4a")
            ? "m4a"
            : "webm";
      form.append("audio", blob, `recording.${ext}`);
      form.append("settings", JSON.stringify(settingsRef.current));

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      let data: TranscribeApiResponse;
      try {
        data = (await res.json()) as TranscribeApiResponse;
      } catch {
        data = { error: `HTTP ${res.status}` };
      }
      return { res, data };
    };

    try {
      let lastData: TranscribeApiResponse | null = null;
      let lastRes: Response | null = null;

      for (let attempt = 0; attempt < MAX_RATE_LIMIT_RETRIES; attempt++) {
        const { res, data } = await postOnce();
        lastData = data;
        lastRes = res;

        if (!isEmptyUsage(data.usage) && mountedRef.current) {
          setLastUsage(data.usage!);
          writeGroqQuotaToSession(data.usage!);
        }

        if (res.ok && !data.error) {
          const text = (data.text ?? "").trim();
          if (text) onTranscriptRef.current(text);
          if (mountedRef.current) setState("idle");
          return;
        }

        if (
          res.status === 429 &&
          attempt < MAX_RATE_LIMIT_RETRIES - 1 &&
          mountedRef.current
        ) {
          const waitMs =
            retryAfterMsFromResponse(res, data) ??
            Math.min(1500 * 2 ** attempt + Math.random() * 200, 30_000);
          await sleep(waitMs);
          continue;
        }

        const msg =
          data.error ??
          `Transcription failed (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      const msg =
        lastData?.error ??
        (lastRes
          ? `Transcription failed (HTTP ${lastRes.status}).`
          : "Transcription failed — try again.");
      throw new Error(msg);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Transcription failed — try again.";
      onErrorRef.current?.(msg);
      if (mountedRef.current) {
        setState("error");
        setTimeout(() => {
          if (mountedRef.current) setState("idle");
        }, 3_000);
      }
    }
  }, []);

  // ── stop ─────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") {
      // If we somehow got here while no recorder is active, make sure state
      // is cleaned up so the button isn't stuck.
      if (stateRef.current === "recording") {
        void releaseStream().then(() => {
          if (mountedRef.current) setState("idle");
        });
      }
      return;
    }
    rec.stop(); // triggers onstop → releaseStream + transcribe
  }, [releaseStream]);

  // ── start ────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    const s = stateRef.current;
    // Guard: don't start if already active or another start() is in-flight
    if (s !== "idle" && s !== "error") return;
    if (startingRef.current) return;
    startingRef.current = true;

    // Optimistically move to "recording" state immediately so the UI feels
    // responsive before getUserMedia resolves (which can take hundreds of ms).
    if (mountedRef.current) setState("recording");

    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          // Note: sampleRate is a hint only and often ignored by macOS/Chrome.
          // Omitting it avoids OverconstrainedError on some devices.
          channelCount: 1,
        },
        video: false,
      });
    } catch (e) {
      startingRef.current = false;
      const isDenied =
        e instanceof DOMException &&
        (e.name === "NotAllowedError" || e.name === "PermissionDeniedError");
      const msg = isDenied
        ? "Microphone access denied. Allow it in browser/system settings."
        : "Could not access microphone.";
      onErrorRef.current?.(msg);
      if (mountedRef.current) {
        setState("error");
        setTimeout(() => {
          if (mountedRef.current) setState("idle");
        }, 3_000);
      }
      return;
    }

    if (!mountedRef.current) {
      // Component unmounted while getUserMedia was pending — release immediately
      startingRef.current = false;
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;
    startLevelMonitor(stream);

    const mimeType = pickBestMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
    } catch {
      // Fallback: try without mimeType constraint
      try {
        recorder = new MediaRecorder(stream);
      } catch (err) {
        startingRef.current = false;
        const msg =
          err instanceof Error
            ? `Could not start recorder: ${err.message}`
            : "Could not start recorder.";
        onErrorRef.current?.(msg);
        await releaseStream();
        if (mountedRef.current) {
          setState("error");
          setTimeout(() => {
            if (mountedRef.current) setState("idle");
          }, 3_000);
        }
        return;
      }
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      recorderRef.current = null;
      await releaseStream();
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      chunksRef.current = [];
      if (blob.size >= MIN_BLOB_SIZE_BYTES) {
        await transcribe(blob);
      } else {
        if (mountedRef.current) setState("idle");
      }
    };

    recorder.onerror = async () => {
      recorderRef.current = null;
      await releaseStream();
      onErrorRef.current?.("Recording error — please try again.");
      if (mountedRef.current) {
        setState("error");
        setTimeout(() => {
          if (mountedRef.current) setState("idle");
        }, 3_000);
      }
    };

    // Use a timeslice so ondataavailable fires periodically — this lets us
    // detect genuine recording activity and helps on some browser/OS combos.
    recorder.start(250);
    startingRef.current = false;

    // Safety auto-stop
    autoStopTimerRef.current = setTimeout(() => stop(), maxDurationMs);
  }, [startLevelMonitor, releaseStream, transcribe, stop, maxDurationMs]);

  // ── toggle ───────────────────────────────────────────────────────────────

  const toggle = useCallback(async () => {
    const s = stateRef.current;
    if (s === "idle" || s === "error") {
      await start();
    } else if (s === "recording") {
      stop();
    }
    // "transcribing" — ignore clicks while processing
  }, [start, stop]);

  // ── unmount cleanup ──────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(autoStopTimerRef.current);
      // Stop recorder if active (won't fire onstop callbacks since mounted = false)
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try { rec.stop(); } catch { /* ignore */ }
      }
      recorderRef.current = null;
      // Fire-and-forget stream release on unmount
      void shutdownStream(
        streamRef.current,
        audioCtxRef.current,
        animFrameRef.current,
      );
      streamRef.current = null;
      audioCtxRef.current = null;
    };
  }, []);

  return {
    state,
    audioLevel,
    lastUsage,
    toggle,
    stop,
    isActive: state !== "idle",
  } as const;
}
