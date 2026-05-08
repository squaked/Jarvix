# Jarvix — Your personal AI assistant for Mac

Local-first chat UI with streaming models (OpenRouter, Google Gemini, Groq), macOS tools (Spotlight, Calendar, screenshots), and free web search via DuckDuckGo instant answers.

## Install (one command)

Open **Terminal** (press `⌘ Space`, type "Terminal", press Enter) and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/jarvix/main/install.sh | bash
```

That's it. The installer will:
1. Install any missing tools automatically
2. Download and build Jarvix in the background
3. Start Jarvix and open it in your browser
4. Add a **Jarvix** app and an **Update Jarvix** app to `~/Applications` — drag them to your Dock
5. Keep Jarvix **running in the background** and **auto-update nightly** — no action needed

After install, click the Jarvix icon in your Dock (or open [http://localhost:3000](http://localhost:3000)) and complete the quick onboarding to add your AI key. To update immediately at any time, double-click **Update Jarvix** in your Applications folder.

**To uninstall:** paste this in Terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/jarvix/main/scripts/uninstall.sh | bash
```

### Private repo / alternate location

```bash
# If the repo is private, pass a read-only GitHub token:
JARVIX_GITHUB_TOKEN=ghp_yourtoken \
  curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/jarvix/main/install.sh | bash

# To install to a different folder:
JARVIX_INSTALL_DIR=~/my-jarvix \
  curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/jarvix/main/install.sh | bash
```

## Development

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
