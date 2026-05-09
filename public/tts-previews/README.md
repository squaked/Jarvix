# Bundled voice previews (Groq Orpheus)

WAV clips for **Settings → Read aloud → Play** (`troy.wav`, `austin.wav`, …).

Generate on a Mac/PC with Groq API access:

```bash
export GROQ_API_KEY='your-key-here'
npm run generate:tts-previews
```

Keep sample text aligned with `TTS_VOICE_SAMPLE` in `lib/tts-voices.ts`, or regenerate after editing that object.
