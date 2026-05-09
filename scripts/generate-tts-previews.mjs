#!/usr/bin/env node
/**
 * Downloads Orpheus WAV samples into public/tts-previews/ using your Groq key.
 *
 * Sync the `SAMPLES` object with lib/tts-voices.ts → TTS_VOICE_SAMPLE.
 *
 *   export GROQ_API_KEY='...'
 *   npm run generate:tts-previews
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "tts-previews");

const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";
const MODEL = "canopylabs/orpheus-v1-english";

/** Must match lib/tts-voices.ts → TTS_VOICE_SAMPLE */
const SAMPLES = {
  troy:
    "Hi, I’m Troy — this is how I sound in Jarvix. Easy and conversational.",
  austin:
    "Hi, I’m Austin — this is how I sound in Jarvix. [casual] Let’s get going.",
  autumn:
    "Hi, I’m Autumn — this is how I sound in Jarvix. [friendly] Nice to meet you.",
  hannah:
    "Hi, I’m Hannah — this is how I sound in Jarvix. [warm] Thanks for listening.",
};

async function main() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set GROQ_API_KEY, then rerun.");
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  for (const [voice, input] of Object.entries(SAMPLES)) {
    const res = await fetch(GROQ_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        voice,
        input,
        response_format: "wav",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`${voice}: HTTP ${res.status}`, errText || "");
      process.exit(1);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const fp = path.join(OUT, `${voice}.wav`);
    fs.writeFileSync(fp, buf);
    console.log("Wrote", path.relative(ROOT, fp), `(${buf.length} bytes)`);
  }

  console.log("Done. Commit public/tts-previews/*.wav if you want previews for everyone.");
}

void main();
