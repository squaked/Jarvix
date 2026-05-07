import type { NextRequest } from "next/server";
import { groqUsageFromHeaders } from "@/lib/groq-usage-from-headers";
import { mergeSettingsPartial } from "@/lib/settings-merge";
import type { GroqTranscriptionUsage } from "@/lib/transcribe-api-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

function mimeToExtension(mime: string): string {
  if (mime.startsWith("audio/webm")) return "webm";
  if (mime.startsWith("audio/ogg")) return "ogg";
  if (mime.startsWith("audio/mp4") || mime.startsWith("audio/x-m4a"))
    return "m4a";
  if (mime.startsWith("audio/mpeg") || mime.startsWith("audio/mp3"))
    return "mp3";
  if (mime.startsWith("audio/wav") || mime.startsWith("audio/wave"))
    return "wav";
  if (mime.startsWith("audio/flac")) return "flac";
  return "webm";
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile || audioFile.size === 0) {
    return Response.json({ error: "No audio provided" }, { status: 400 });
  }

  const settingsRaw = formData.get("settings");
  let settingsParsed: Record<string, unknown> = {};
  if (typeof settingsRaw === "string") {
    try {
      settingsParsed = JSON.parse(settingsRaw) as Record<string, unknown>;
    } catch {
      /* use defaults */
    }
  }

  const settings = mergeSettingsPartial(settingsParsed);
  const profile = settings.profiles.groq;
  const apiKey =
    profile.apiKey.trim() || process.env.GROQ_API_KEY?.trim() || "";

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing Groq API key. Add your key in Settings to enable voice input.",
      },
      { status: 401 },
    );
  }

  const mime = audioFile.type || "audio/webm";
  const ext = mimeToExtension(mime);
  const fileName = `recording.${ext}`;

  const groqForm = new FormData();
  const audioBuffer = await audioFile.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: mime });
  groqForm.append("file", audioBlob, fileName);
  groqForm.append("model", "whisper-large-v3");
  groqForm.append("response_format", "json");
  groqForm.append("temperature", "0");

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? `Network error: ${e.message}`
            : "Failed to reach Groq API",
      },
      { status: 502 },
    );
  }

  const usage = groqUsageFromHeaders(groqRes.headers);

  if (!groqRes.ok) {
    let detail = groqRes.statusText;
    try {
      const body = (await groqRes.json()) as {
        error?: { message?: string } | string;
      };
      if (typeof body.error === "string") detail = body.error;
      else if (typeof body.error?.message === "string")
        detail = body.error.message;
    } catch {
      /* keep statusText */
    }

    const is429 = groqRes.status === 429;
    const suffix =
      is429 && usage.retryAfterSeconds != null
        ? ` Retry after ${usage.retryAfterSeconds}s (Groq rate limit).`
        : is429
          ? " Groq rate limit reached — see console.groq.com docs for limits and retry-after."
          : "";

    return Response.json(
      {
        error: `Transcription failed: ${detail}${suffix}`,
        usage: Object.keys(usage).length ? usage : undefined,
      },
      {
        status: groqRes.status,
        headers:
          usage.retryAfterSeconds != null
            ? { "Retry-After": String(usage.retryAfterSeconds) }
            : undefined,
      },
    );
  }

  const result = (await groqRes.json()) as { text?: string };
  return Response.json({
    text: result.text?.trim() ?? "",
    usage: Object.keys(usage).length ? usage : undefined,
  });
}
