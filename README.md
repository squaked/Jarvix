# Jarvix — Your personal AI assistant for Mac

Local-first chat UI with streaming models (OpenRouter, Google Gemini, Groq), macOS tools (Spotlight, Calendar, screenshots), and free web search via DuckDuckGo instant answers.

## Install (one command)

Open **Terminal** (press `⌘ Space`, type "Terminal", press Enter) and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/squaked/Jarvix/main/install.sh | bash
```

Repository names on GitHub use a capital **J** (`squaked/Jarvix`). If your default branch is not `main`, replace `main` in the URL with your branch name.

That's it. The installer will:
1. Install any missing tools automatically
2. Download and build Jarvix in the background
3. Start Jarvix and open it in your browser
4. Add **Jarvix** to `~/Applications/Jarvix.app` — drag it to your Dock
5. Keep Jarvix **running in the background** with **nightly updates**; when a new build is ready, a **Restart to apply** button appears in the app

After install, click the Jarvix icon in your Dock (or open [http://localhost:3000](http://localhost:3000)) and complete the quick onboarding to add your AI key.

**To uninstall:** paste this in Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/squaked/Jarvix/main/scripts/uninstall.sh | bash
```

### If `curl` prints `404: Not Found`

That almost always means either the file is not on GitHub yet (push `install.sh` on `main`), the URL has a typo, **or the repository is private.**

For a **private** repository, unauthenticated `curl` to `raw.githubusercontent.com` returns **404** (GitHub hides whether the file exists). You must send a token **and** give the installer a token so `git clone` works:

```bash
export GITHUB_TOKEN=ghp_YOUR_READONLY_CLASSIC_PAT

curl -fsSL \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://raw.githubusercontent.com/squaked/Jarvix/main/install.sh | \
  JARVIX_GITHUB_TOKEN="$GITHUB_TOKEN" bash
```

Use a classic personal access token with **Contents: Read** on this repo (fine-grained PATs also work with `Bearer`). Do not share or commit the token.

### Fork / alternate repo or install directory

```bash
# Different Git URL (fork or rename):
JARVIX_REPO_URL=https://github.com/you/your-fork.git \
  curl -fsSL https://raw.githubusercontent.com/squaked/Jarvix/main/install.sh | bash

# Different install folder:
JARVIX_INSTALL_DIR=~/my-jarvix \
  curl -fsSL https://raw.githubusercontent.com/squaked/Jarvix/main/install.sh | bash
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
