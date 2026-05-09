import { NextResponse } from "next/server";
import {
  resolveGroqApiKey,
} from "@/lib/settings-credentials";
import { mergeProfileRecords, mergeSettingsPartial } from "@/lib/settings-merge";
import { readSettingsFile } from "@/lib/settings-file-store";
import { formatGroqApiErrorBodyForUser } from "@/lib/groq-user-error-message";
import type { Settings, TtsVoiceId } from "@/lib/types";
import { chunkTextForOrpheus } from "@/lib/tts-chunk";
import {
  ORPHEUS_ENGLISH_VOICES,
  ORPHEUS_TTS_MODEL,
  isTtsVoiceId,
} from "@/lib/tts-voices";

export const runtime = "nodejs";

const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";

type Body = {
  text?: unknown;
  voice?: unknown;
  /** Mirrors chat: browser settings (key may exist here before disk save). */
  settings?: unknown;
};

function mergedAuthSettings(client: unknown, disk: Settings): Settings {
  if (!client || typeof client !== "object") return disk;
  const c = client as Partial<Settings>;
  return mergeSettingsPartial({
    ...disk,
    profiles:
      c.profiles != null
        ? mergeProfileRecords(disk.profiles, c.profiles)
        : disk.profiles,
  });
}

/**
 * Generate speech via Groq Orpheus (wav). Input is chunked to 200 characters
 * server-side; response is the first chunk only for simple client loops, or
 * we could extend to multi-part. For now: one segment per request —
 * client sends pre-chunked text OR we truncate to first chunk here.
 *
 * Actually client will send full text and we chunk - return error if >200?
 * Better API: accept `text` full, server chunks and returns... multiple wavs is hard.
 *
 * Contract: `text` must be <= 200 chars (one Orpheus segment). Client uses chunkTextForOrpheus.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const textIn = typeof body.text === "string" ? body.text : "";
  const trimmed = textIn.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const voiceIn = typeof body.voice === "string" ? body.voice : "";
  const voice: TtsVoiceId = isTtsVoiceId(voiceIn)
    ? voiceIn
    : ORPHEUS_ENGLISH_VOICES[0]!.id;

  const segments = chunkTextForOrpheus(trimmed);
  const segment = segments[0];
  if (!segment) {
    return NextResponse.json({ error: "Empty speech" }, { status: 400 });
  }
  if (trimmed.length > segment.length) {
    return NextResponse.json(
      {
        error: "Text too long for a single segment — client should send one chunk at a time",
      },
      { status: 400 },
    );
  }

  const disk = mergeSettingsPartial(await readSettingsFile());
  const merged = mergedAuthSettings(body.settings, disk);
  const apiKey = resolveGroqApiKey(merged);
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 401 });
  }
  const res = await fetch(GROQ_SPEECH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ORPHEUS_TTS_MODEL,
      voice,
      input: segment,
      response_format: "wav",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const error =
      errText.trim() !== ""
        ? formatGroqApiErrorBodyForUser(errText)
        : `Groq TTS failed (HTTP ${res.status})`;
    return NextResponse.json({ error }, { status: 502 });
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
