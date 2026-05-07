# Jarvix — Your personal AI assistant for Mac

Local-first chat UI with streaming models (OpenRouter, Google Gemini, Groq), macOS tools (Spotlight, Calendar, screenshots), and free web search via DuckDuckGo instant answers.

## Quick install (planned distribution)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/jarvix/main/install.sh | bash
```

Use `JARVIX_REPO_URL` (or legacy `JARVIS_REPO_URL`) if you fork the repo. Development clone:

```bash
git clone <your-repo-url> jarvix && cd jarvix && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Complete onboarding, then chat.

## Features

- Streaming chat with tool calls (web search, weather, Calendar, Spotlight file search, screenshots)
- **Local data**: everything is stored under **`.jarvix-data/`** in your Jarvix project directory (ignored by git): `memory.json`, `chats.json`, `settings.json`. Existing **`.jarvis-data/`** folders are still used if present.
- **`localStorage` mirror**: `jarvix_settings_mirror` — copy of BYOK/settings for instant reload; if the data dir is unavailable (wrong cwd), the app can still reopen chat then backfill disk on save. Older keys (e.g. `jarvis_settings_mirror`) are migrated automatically.
- Older installs had memory at `~/.jarvis/memory.json` (or `~/.jarvix/memory.json`); Jarvix migrates from there automatically once.
- Dark / light / system theme (next-themes)

## Manual configuration

- **Web search**: DuckDuckGo’s free [instant-answer JSON API](https://api.duckduckgo.com/) (encyclopedia-style answers and related links, not full Google-style SERPs).
- **BYOK**: OpenRouter / Google AI / Groq keys from each provider’s dashboard.
- After replies, Jarvix may run a **best-effort memory pass** when memory is enabled (small follow-up completion; skips short answers).

## Development checklist

```bash
npm install
npm run typecheck && npm run lint && npm run build
npm run dev
```

Optional: copy [.env.example](.env.example) to `.env.local` for `JARVIX_DATA_DIR` (or legacy `JARVIS_DATA_DIR`) if you need to override the data directory.

## Tech stack

- Next.js 14 App Router, TypeScript, Tailwind
- Vercel AI SDK (`ai` v6) + OpenRouter / Gemini / Groq providers
- Framer Motion, react-markdown
- `eventkit-node` for Calendar (macOS)

## Contributing

Issues and PRs welcome. Please keep changes scoped and match existing patterns.

## License

MIT
