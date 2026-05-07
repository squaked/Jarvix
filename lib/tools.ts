/**
 * Tool **names** wired in `lib/jarvix-tools.ts` (must stay in sync manually).
 */
export const JARVIX_TOOL_NAMES = [
  "web_search",
  "fetch_web_page",
  "weather",
  "calendar_events_today",
  "calendar_events_range",
  "calendar_create_event",
  "file_search",
  "screenshot",
  "remember_user_note", // gated by Memory in Settings (`createJarvixToolset`)
] as const;

/**
 * OpenAI-style tool stubs for docs / interoperability (schemas live in AI SDK `tool()` definitions).
 */
export const OPENAI_STYLE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web (DuckDuckGo instant answers, then Bing RSS fallback for broader results).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_web_page",
      description:
        "Fetch readable text from one public http(s) URL (HTML stripped, no JS).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "weather",
      description: "Current weather by city (Open-Meteo).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calendar_events_today",
      description: "Read Apple Calendar events for today.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calendar_events_range",
      description: "Read Apple Calendar events in a date range (ISO / YYYY-MM-DD).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calendar_create_event",
      description: "Create an Apple Calendar event.",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "file_search",
      description: "Spotlight search files by name or content (mdfind).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "screenshot",
      description:
        "Capture main display PNG into the project data dir as last-screenshot.png (macOS).",
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remember_user_note",
      description:
        "Save a durable note about the user for future chats (when Memory enabled).",
    },
  },
] as const;
