# Jarvix — UI/UX Tech Plan & Cursor Prompts

## Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | You know it, API routes = no separate backend |
| Styling | Tailwind CSS + CSS variables | Fast, themeable, clean |
| Fonts | Geist (body) + Instrument Serif (assistant messages) | Arc-like warmth, not generic |
| Animations | Framer Motion | Smooth message reveals, tool cards |
| AI | OpenRouter via API routes | BYOK, multi-model |
| Calendar/Reminders | `eventkit-node` | Native Apple EventKit, no OAuth |
| Web search | DuckDuckGo Instant Answer API | Free, no key; summaries + related links |
| Weather | Open-Meteo | No key needed |
| Memory | Local `memory.json` in app data | Simple, human-readable |
| File search | `mdfind` via `child_process` | macOS Spotlight, zero setup |
| Screenshot | `screencapture` CLI → vision LLM | Built into macOS |
| Install | `install.sh` curl script | Dev: npm run dev |

---

## UI/UX Spec

### Design Language

- **Vibe**: Arc meets Notion. Warm, approachable, slightly playful. Not a sci-fi HUD.
- **Radius**: `rounded-2xl` everywhere. Soft, bubbly, friendly.
- **Shadow**: Subtle `shadow-sm` on cards. No harsh borders.
- **Spacing**: Generous padding. Breathable. Nothing cramped.
- **Motion**: Messages slide up gently on appear. Tool cards expand smoothly. No janky pops.

### Color System (CSS variables)

```css
/* Light */
--bg: #FAFAF9;            /* warm white, not pure white */
--surface: #FFFFFF;
--surface-2: #F5F4F2;     /* sidebar, input bg */
--border: #E8E6E1;
--text: #1A1917;
--text-muted: #78716C;
--accent: #7C6EF5;        /* Arc-inspired violet */
--accent-soft: #EDE9FE;

/* Dark */
--bg: #141413;
--surface: #1C1B1A;
--surface-2: #242320;
--border: #2E2C29;
--text: #F5F4F2;
--text-muted: #78716C;
--accent: #9D8FFF;
--accent-soft: #2D2640;
```

### Pages & Routes

```
/              → redirects to /chat
/chat          → main chat interface
/chat/[id]     → specific conversation
/settings      → API keys, model, theme, memory viewer
/onboarding    → first-run flow (no API key detected)
```

---

### Page: `/onboarding`

**Purpose**: First time user opens the app. No API key set yet.

**Layout**: Centered card, max-w-md, vertically centered on screen.

**Flow**:

1. Welcome screen — App name + tagline + "Let's get you set up" CTA
2. Provider picker — Cards for OpenRouter / Gemini / Groq (with logos, free tier badge)
3. API key input — Password field + "Get your key →" link + Test button
4. Done screen — Animated checkmark + "Open Jarvix" button

**UX details**:

- Progress dots at top (3 steps)
- Back button on steps 2+
- Test button hits `/api/test-key` and shows inline success/error
- Smooth fade + slide between steps (Framer Motion `AnimatePresence`)

---

### Page: `/chat`

**Layout**: Two-column. Left sidebar (260px fixed) + main chat area.

```
┌─────────────────────────────────────────────────┐
│  Sidebar (260px)    │  Chat area (flex-1)        │
│                     │                            │
│  [☀/🌙] [Settings] │  Messages list             │
│                     │                            │
│  + New Chat         │                            │
│                     │                            │
│  Today              │                            │
│  · Chat title       │                            │
│  · Chat title       │                            │
│                     │                            │
│  Yesterday          │                            │
│  · Chat title       │                            │
│                     │  ┌─────────────────────┐   │
│                     │  │ Input bar           │   │
│                     │  └─────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Sidebar

- **Top**: Theme toggle (sun/moon icon) + Settings icon, inline, top-right of sidebar
- **New Chat button**: `+ New chat` with subtle border, full width
- **History**: Grouped by Today / Yesterday / This week / Older
  - Each item: truncated title, hover reveals delete icon
  - Active item: `--accent-soft` background + left accent bar
- **Bottom**: Avatar / user info area (just shows memory nickname if set)

#### Chat Area — Empty State

When no messages yet, show centered:

- Large app icon or wordmark
- 3–4 suggestion chips: "What's on my calendar today?", "Search the web for...", "What's the weather?", "Remind me to..."
- Clicking a chip fills the input

#### Chat Area — Messages

**User message**:

- Right-aligned
- `--accent` background, white text
- `rounded-2xl rounded-br-sm` (speech bubble tail effect)
- Max-width: 70%

**Assistant message**:

- Left-aligned
- `--surface` background with `--border` border
- `rounded-2xl rounded-bl-sm`
- Instrument Serif for the text (warm, readable)
- Small Jarvix avatar dot (violet circle, left of bubble)
- Markdown rendered (bold, lists, code blocks)
- Max-width: 75%
- Streaming: characters appear with a blinking cursor `▋` until done

**Tool call card** (appears between thinking and response):

- Inline, left-aligned, smaller than messages
- Icon + label: `🔍 Searching the web...` / `📅 Reading calendar...`
- Expands on click to show raw tool result (collapsed by default)
- Soft `--surface-2` background, dashed border
- Shows as loading (animated dots) while running, then checkmark when done

**System/error messages**:

- Centered, small, muted text
- e.g. "API key missing — go to Settings"

#### Input Bar

Sticky to bottom, `--surface` background, top border.

```
┌────────────────────────────────────────────────┐
│ 📎  Type a message...                    ↑ Send │
└────────────────────────────────────────────────┘
```

- Auto-resizing `<textarea>` (1 line default, grows to 6 lines max)
- `Enter` = send, `Shift+Enter` = new line
- `Cmd+K` = focus input from anywhere
- 📎 button = screenshot capture (calls `/api/screenshot` → attaches image)
- Send button: filled accent, disabled when empty, shows spinner when loading
- Subtle placeholder rotation: "Ask anything...", "What's on my calendar?", "Search the web...", etc.

---

### Page: `/settings`

**Layout**: Centered max-w-2xl, sectioned with headers.

**Sections**:

1. **AI Provider**
   - Provider dropdown (OpenRouter / Gemini / Groq)
   - API key input (masked, show/hide toggle)
   - Model selector (dropdown, populated based on provider)
   - "Test connection" button → inline success/error

2. **Appearance**
   - Theme toggle: Light / Dark / System (segmented control)

3. **Memory**
   - Toggle: Enable memory on/off
   - Memory viewer: scrollable list of stored facts
   - Each fact: text + delete button
   - "Clear all memory" danger button

4. **About**
   - Version, GitHub link, "Star on GitHub ⭐" CTA

---

## File Structure

```
jarvix/
├── app/
│   ├── page.tsx                    # redirects to /chat
│   ├── onboarding/page.tsx
│   ├── chat/
│   │   ├── page.tsx                # new chat
│   │   └── [id]/page.tsx           # existing chat
│   ├── settings/page.tsx
│   └── api/
│       ├── chat/route.ts           # main streaming chat endpoint
│       ├── test-key/route.ts       # validate API key
│       ├── screenshot/route.ts     # capture screen
│       └── tools/
│           ├── search.ts
│           ├── weather.ts
│           ├── calendar.ts
│           ├── reminders.ts
│           ├── files.ts
│           └── memory.ts
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ToolCallCard.tsx
│   │   ├── InputBar.tsx
│   │   ├── SuggestionChips.tsx
│   │   └── StreamingCursor.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── ChatHistory.tsx
│   │   └── NewChatButton.tsx
│   ├── settings/
│   │   ├── ProviderForm.tsx
│   │   ├── MemoryViewer.tsx
│   │   └── ThemeToggle.tsx
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx
│   │   ├── ProviderPicker.tsx
│   │   └── ApiKeyInput.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── ai.ts                       # OpenRouter streaming
│   ├── tools.ts                    # tool definitions for LLM
│   ├── memory.ts                   # read/write memory.json
│   ├── storage.ts                  # chat history (localStorage)
│   └── settings.ts                 # read/write settings (localStorage)
├── styles/
│   └── globals.css                 # CSS variables, theme classes
├── install.sh
└── README.md
```

---

## Cursor Prompts

Paste these **in order**. Each prompt is self-contained.

---

### PROMPT 1 — Project Setup & Design System

```
Create a new Next.js 14 app (App Router, TypeScript, Tailwind) called "jarvix".

Set up the design system in `styles/globals.css`:

CSS variables for light/dark themes:
- Light: --bg: #FAFAF9, --surface: #FFFFFF, --surface-2: #F5F4F2, --border: #E8E6E1, --text: #1A1917, --text-muted: #78716C, --accent: #7C6EF5, --accent-soft: #EDE9FE
- Dark: --bg: #141413, --surface: #1C1B1A, --surface-2: #242320, --border: #2E2C29, --text: #F5F4F2, --text-muted: #78716C, --accent: #9D8FFF, --accent-soft: #2D2640

Apply variables via a `.dark` class on `<html>`.

Install and configure:
- `framer-motion`
- `next-themes` (for dark/light/system toggle)
- `geist` font (body)
- `@fontsource/instrument-serif` (assistant messages)

In `tailwind.config.ts`, extend theme to use CSS variables for colors (bg, surface, border, text, accent, etc.).

Create `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/Card.tsx` — minimal, unstyled-base components using CSS variables. Rounded-2xl, soft shadows, accent color for primary variants.
```

---

### PROMPT 2 — Settings Storage & API Key Logic

```
Create `lib/settings.ts`:
- Store settings in localStorage under key "jarvix_settings"
- Type: { provider: 'openrouter' | 'gemini' | 'groq', apiKey: string, model: string, memoryEnabled: boolean }
- Functions: getSettings(), saveSettings(partial), clearSettings()
- Default provider: 'openrouter', default model: 'openai/gpt-4o-mini'

Create `app/api/test-key/route.ts`:
- POST endpoint, body: { provider, apiKey, model }
- Makes a minimal test call to the provider's API (1 token max)
- Returns { success: boolean, error?: string }

Create `lib/memory.ts`:
- Store memory in a JSON file at `~/.jarvix/memory.json` (use `os.homedir()`)
- Type: Array<{ id: string, fact: string, createdAt: string }>
- Functions: getMemory(), addMemory(fact: string), deleteMemory(id: string), clearMemory()
- Create the directory if it doesn't exist

Create `lib/storage.ts`:
- Store chat history in localStorage under "jarvix_chats"
- Type: Array<{ id: string, title: string, messages: Message[], createdAt: string, updatedAt: string }>
- Functions: getChats(), getChat(id), saveChat(chat), deleteChat(id), createChat()
- Auto-generate title from first user message (first 40 chars)
```

---

### PROMPT 3 — Tool Implementations

```
Create `app/api/tools/` with these Next.js route handlers and helper functions:

1. `search.ts` (exported function, not route):
- Uses DuckDuckGo Instant Answer API: https://api.duckduckgo.com (no API key)
- Param: query string
- Returns top 5 results: { title, url, description }[]

2. `weather.ts` (exported function):
- Uses Open-Meteo: https://api.open-meteo.com/v1/forecast
- First geocode city with https://geocoding-api.open-meteo.com/v1/search
- Returns: { temp_c, feels_like_c, description, city }

3. `calendar.ts` (exported function):
- Uses `eventkit-node` npm package
- getEventsToday(): returns today's events { title, start, end, calendar }[]
- getEventsRange(start: Date, end: Date): same but ranged
- createEvent({ title, start, end, notes? }): creates event, returns id
- Install: npm install eventkit-node

4. `reminders.ts` (exported function):
- Uses `eventkit-node`
- getReminders(listName?: string): returns { title, dueDate, completed, id }[]
- createReminder({ title, dueDate?, notes? }): creates reminder
- completeReminder(id: string): marks done

5. `files.ts` (exported function):
- Uses child_process to run: mdfind -name "QUERY" | head -20
- Returns: { name, path, modified }[]
- Also supports content search: mdfind "QUERY" | head -10

6. `screenshot.ts` (exported function):
- Uses child_process to run: screencapture -x /tmp/jarvix_screenshot.png
- Reads the file as base64
- Returns: { base64: string, mimeType: 'image/png' }
- Deletes the temp file after reading

Create `lib/tools.ts`:
- Exports TOOLS array: OpenAI-compatible tool definitions for all 6 tools above
- Each tool has name, description, and JSON schema for parameters
```

---

### PROMPT 4 — Streaming Chat API Route

```
Create `app/api/chat/route.ts`:

POST endpoint that:
1. Receives: { messages: Message[], settings: Settings }
2. Loads memory from `lib/memory.ts` and prepends as system context:
   "You are Jarvix, a personal AI assistant running on the user's Mac. Be concise, warm, and helpful. 
   Things you know about the user: [memory facts joined by newline]"
3. Calls the appropriate LLM via OpenRouter (or Gemini/Groq based on settings.provider):
   - Uses streaming (SSE)
   - Passes all TOOLS from lib/tools.ts
4. Handles tool calls:
   - When model calls a tool, execute the corresponding function from app/api/tools/
   - Stream a tool_call event to client: { type: 'tool_call', tool: name, status: 'running' }
   - After execution, stream: { type: 'tool_call', tool: name, status: 'done', result: ... }
   - Send tool result back to model, continue streaming
5. Streams text tokens as: { type: 'text', delta: '...' }
6. On finish: { type: 'done' }
7. If memory is enabled and response contains new info about user, append to memory

Use the Vercel AI SDK (`ai` package) for streaming. Stream format: newline-delimited JSON.
```

---

### PROMPT 5 — Onboarding Flow

```
Create the onboarding flow at `app/onboarding/page.tsx`.

It's a centered card (max-w-md, mx-auto, mt-32) with 3 steps. Use Framer Motion AnimatePresence for step transitions (slide left/right with fade).

Progress indicator: 3 dots at top, filled dot = current step.

Step 1 — Welcome:
- Large "👋" emoji
- Heading: "Meet Jarvix"
- Subtext: "Your personal AI assistant for Mac. Let's get you set up in 30 seconds."
- CTA button: "Get started →" (accent color, full width)

Step 2 — Pick provider:
- Heading: "Choose your AI provider"
- 3 cards (selectable): OpenRouter / Google Gemini / Groq
  - Each shows logo (use emoji as placeholder: 🔀 / 🔷 / ⚡), name, and a "Free tier available" green badge
  - Selected state: accent border + accent-soft bg
- Link below: "What's the difference?" → opens a small tooltip/popover explaining each
- Next button (disabled until selection)

Step 3 — API Key:
- Heading: "Enter your [Provider] API key"
- Link: "Get your free key at [provider site] →" (opens in browser)
- Password input with show/hide toggle
- "Test connection" button → shows spinner → inline success (green check) or error (red message)
- "Done" button (disabled until test passes)

On completion: save to settings via `lib/settings.ts`, redirect to `/chat`.

Check on app load (`app/layout.tsx`): if no API key in settings → redirect to `/onboarding`.
```

---

### PROMPT 6 — Sidebar Component

```
Create `components/sidebar/Sidebar.tsx`:

Fixed left sidebar, 260px wide, full height, `--surface-2` background, right border `--border`.

Top section:
- App name "Jarvix" in Geist font, semi-bold, with a small violet dot before it (like a status indicator)
- Right side: ThemeToggle icon button (sun/moon) + Settings icon button (links to /settings)

New Chat button:
- Full width, below header
- "＋ New chat" text, `--surface` bg, `--border` border, rounded-xl
- Hover: slight bg shift
- Click: creates new chat via `lib/storage.ts`, navigates to /chat/[newId]

Chat History:
- Grouped: "Today", "Yesterday", "This week", "Older"
- Group headers: small, muted, uppercase, letter-spacing
- Each chat item: 
  - Single line truncated title
  - Hover: `--surface` background, shows a trash icon on right (delete on click with confirm)
  - Active: `--accent-soft` background + 2px left border in `--accent`
  - Click: navigate to /chat/[id]

Bottom: subtle version number, muted text.

Make it responsive: on mobile (< 768px) sidebar is hidden, hamburger menu shows/hides it as a drawer overlay.
```

---

### PROMPT 7 — Message Components

```
Create these chat components:

1. `components/chat/MessageBubble.tsx`:
Props: { role: 'user' | 'assistant', content: string, isStreaming?: boolean }

User bubble:
- Right-aligned, max-w-[70%]
- Background: `--accent`, text: white
- Rounded: rounded-2xl rounded-br-sm (tail bottom-right)
- Padding: px-4 py-3
- Font: Geist, 15px

Assistant bubble:
- Left-aligned, max-w-[75%]
- Left of bubble: small violet circle avatar (24px, `--accent` bg, "J" text in white, 11px)
- Background: `--surface`, border: 1px `--border`
- Rounded: rounded-2xl rounded-bl-sm (tail bottom-left)
- Font: Instrument Serif for paragraph text, 16px, line-height 1.7
- Render markdown (install `react-markdown` + `remark-gfm`)
  - Code blocks: monospace, `--surface-2` bg, rounded-lg, padding
  - Bold, italic, lists styled cleanly
- If isStreaming: show blinking cursor `▋` at end (CSS animation, 1s blink)

Entrance animation (Framer Motion):
- Both: fade in + translateY(8px → 0), duration 0.2s, ease-out

2. `components/chat/ToolCallCard.tsx`:
Props: { tool: string, status: 'running' | 'done', result?: any }

- Inline card, left-aligned, max-w-[60%]
- `--surface-2` bg, dashed `--border` border, rounded-xl, px-3 py-2
- Icon + tool name: 🔍 web_search → "Searching the web", 📅 get_calendar → "Reading calendar", etc.
- Status running: animated dots "..." pulse
- Status done: green checkmark, click to expand/collapse result
- Collapsed result: hidden. Expanded: shows JSON result in small monospace, `--surface` bg

3. `components/chat/SuggestionChips.tsx`:
Props: { onSelect: (text: string) => void }
- 4 chips as pill buttons: "What's on my calendar today?", "Search the web for...", "What's the weather in Paris?", "Remind me to..."
- `--surface` bg, `--border` border, rounded-full, px-4 py-2, text-sm
- Hover: `--accent-soft` bg, `--accent` text
- Centered, shown only when no messages

4. `components/chat/InputBar.tsx`:
Props: { onSend: (content: string, screenshot?: string) => void, disabled?: boolean }

- Sticky bottom bar, full width, `--surface` bg, top border `--border`
- Inner container: max-w-3xl, mx-auto, px-4 py-3
- Left: screenshot button (📎 icon, `--text-muted` color)
  - On click: POST /api/screenshot → attach base64 image
  - If image attached: show thumbnail preview with ✕ remove button
- Center: auto-resize textarea
  - Min-height: 1 line, max-height: 6 lines
  - Background: `--surface-2`, rounded-2xl, border `--border`
  - Placeholder rotates every 4s between: "Ask anything...", "What's on my calendar?", "Search the web...", "Remind me to..."
  - Enter = submit, Shift+Enter = newline
- Right: Send button
  - Rounded-xl, `--accent` bg when active, `--surface-2` bg when disabled
  - Shows spinner (Framer Motion rotate) when streaming
- Keyboard shortcut: Cmd+K focuses textarea from anywhere on page
```

---

### PROMPT 8 — Chat Page & Message List

```
Create `app/chat/[id]/page.tsx` (and `app/chat/page.tsx` that creates a new chat and redirects):

Layout: flex row, full height (100vh), overflow hidden.
- Left: <Sidebar /> (260px)
- Right: flex col, flex-1

Right column:
- Top: subtle header bar with current chat title (editable on click), muted, small
- Middle: <MessageList /> (flex-1, overflow-y-auto)
- Bottom: <InputBar />

Create `components/chat/MessageList.tsx`:
- Renders messages array
- Empty state: centered, shows app name + <SuggestionChips />
- For each message: <MessageBubble />
- For tool calls embedded in assistant turn: <ToolCallCard /> rendered before the text response
- Auto-scroll to bottom on new message (useEffect + ref on last message div)
- Smooth scroll behavior

Wire up the full chat flow:
1. User types + hits Enter → append user message to state → call POST /api/chat with full history
2. Read streaming response (newline-delimited JSON)
3. For each chunk:
   - type 'tool_call' + status 'running': add ToolCallCard in loading state
   - type 'tool_call' + status 'done': update ToolCallCard to done
   - type 'text': append delta to current assistant message (streaming bubble)
   - type 'done': finalize message, save chat to localStorage
4. Show InputBar as disabled while streaming, re-enable on done
5. Handle errors: show inline error message in chat

Pass settings (from lib/settings.ts) in each request body.
```

---

### PROMPT 9 — Settings Page

```
Create `app/settings/page.tsx`:

Layout: max-w-2xl, mx-auto, py-12, px-6. Back arrow → /chat at top.

Section 1 — "AI Provider" (Card component):
- Provider selector: 3 segmented buttons (OpenRouter / Gemini / Groq)
- API key: password input, show/hide eye icon, placeholder "sk-..."
- Model: text input (with suggested defaults per provider shown as hint below)
- "Test connection" button → POST /api/test-key → inline feedback
- "Save" button → calls saveSettings()

Section 2 — "Appearance" (Card):
- Theme: 3-option segmented control: Light / Dark / System
- Uses next-themes setTheme()

Section 3 — "Memory" (Card):
- Toggle switch: Enable memory
- If enabled, show memory list:
  - Each item: fact text (truncated) + 🗑 delete button
  - "Clear all memory" button (red, requires confirm)
  - Empty state: "No memories yet. Jarvix will remember things as you chat."

Section 4 — "About" (Card):
- Version: v0.1.0
- "View on GitHub" link (opens external)
- "⭐ Star this project" button

All changes auto-save with a toast notification: small pill that appears bottom-center "Settings saved ✓", fades after 2s.
```

---

### PROMPT 10 — Install Script & README

```
Create `install.sh` in the project root:

#!/bin/bash
set -e

echo "🤖 Installing Jarvix..."

# Check for Node.js, install via homebrew if missing
if ! command -v node &> /dev/null; then
  echo "📦 Node.js not found. Installing via Homebrew..."
  if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install node
fi

# Clone repo
INSTALL_DIR="$HOME/.jarvix-app"
if [ -d "$INSTALL_DIR" ]; then
  echo "🔄 Updating Jarvix..."
  cd "$INSTALL_DIR" && git pull
else
  echo "📥 Cloning Jarvix..."
  git clone https://github.com/YOUR_USERNAME/jarvix "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install deps
npm install --silent

# Build
npm run build --silent

# Start in background and open browser
npm start &
sleep 3
open http://localhost:3000

echo "✅ Jarvix is running at http://localhost:3000"

---

Create `README.md`:
- Hero: "Jarvix — Your personal AI assistant for Mac"
- One-liner install command (the curl command)
- Screenshots section (placeholder)
- Feature list (all MVP features)
- Manual install instructions (for devs)
- Tech stack section
- Contributing section
- License: MIT
```

---

## Build Order

1. Prompt 1 — Setup & design system
2. Prompt 2 — Settings & storage
3. Prompt 3 — Tool implementations
4. Prompt 4 — Streaming chat API
5. Prompt 5 — Onboarding
6. Prompt 6 — Sidebar
7. Prompt 7 — Message components
8. Prompt 8 — Chat page (wire everything)
9. Prompt 9 — Settings page
10. Prompt 10 — Install script + README

Test after each prompt before moving to the next.
