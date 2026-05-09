import type { TtsVoiceId } from "./types";

/** Remove Orpheus `[direction]` fragments so `speechSynthesis` reads clean text. */
export function stripOrpheusDirectionsForSpeech(text: string): string {
  return text.replace(/\[[^\]]*]/g, " ").replace(/\s+/g, " ").trim();
}

const VOICE_TWEEKS: Record<TtsVoiceId, { rate: number; pitch: number }> = {
  troy: { rate: 1, pitch: 1 },
  austin: { rate: 1.05, pitch: 0.95 },
  autumn: { rate: 0.98, pitch: 1.05 },
  hannah: { rate: 0.95, pitch: 1.06 },
};

/**
 * Settings voice preview via the OS/browser engine (does not call Groq).
 */
export function speakBrowserTtsPreview(
  voiceId: TtsVoiceId,
  plainText: string,
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No speech in this environment"));
  }

  const text = stripOrpheusDirectionsForSpeech(plainText);
  if (!text) {
    return Promise.reject(new Error("Nothing to preview"));
  }

  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    const tw = VOICE_TWEEKS[voiceId];
    u.rate = tw.rate;
    u.pitch = tw.pitch;

    u.onend = () => {
      u.onend = null;
      u.onerror = null;
      resolve();
    };

    u.onerror = () => {
      u.onend = null;
      u.onerror = null;
      reject(new Error("Speech preview failed"));
    };

    window.speechSynthesis.speak(u);
  });
}
