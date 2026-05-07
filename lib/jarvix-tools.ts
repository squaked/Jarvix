import { tool } from "ai";
import { z } from "zod";
import { webSearchCombined } from "./tool-runners/web-search";
import { fetchWebPageContent } from "./tool-runners/fetch-web-page";
import {
  calendarCreateEvent,
  getCalendarEventsRangeWithHint,
  getCalendarEventsTodayWithHint,
} from "./tool-runners/eventkit";
import {
  spotlightByName,
  spotlightContent,
} from "./tool-runners/files";
import { captureScreenshotForAssistantTool } from "./tool-runners/screenshot";
import { getWeather } from "./tool-runners/weather";
import { addMemory, getMemory } from "./memory";
import { parseCalendarRangeBounds } from "./calendar-parse";
import { normalizeFact } from "./memory-policy";

/**
 * Gemini (via @ai-sdk/google) maps empty object schemas to `parameters: undefined`, which
 * breaks function declarations and surfaces as MALFORMED_FUNCTION_CALL / “failed_generation”.
 */
const emptyToolInputSchema = z.object({
  unused: z
    .boolean()
    .optional()
    .describe("Ignore — omit this field; schema placeholder only."),
});

const calendarRangeInputSchema = z.object({
  startISO: z
    .string()
    .min(1)
    .describe(
      'Inclusive range start: YYYY-MM-DD (local calendar day) or ISO datetime, e.g. "2026-05-04".',
    ),
  endISO: z
    .string()
    .min(1)
    .describe(
      'Inclusive range end (whole local day if date-only), e.g. "2026-05-10" for week ending Sunday.',
    ),
});

export function createJarvixToolset(ctx: { memoryEnabled?: boolean }) {
  const memoryEnabled = Boolean(ctx.memoryEnabled);
  return {
    web_search: tool({
      description:
        "Search the web (no API key): tries DuckDuckGo instant answers first, then Bing web results (RSS) when instant has nothing — use for news, recent topics, and general lookups.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Search query string"),
      }),
      execute: async ({ query }) => {
        const q = query.trim();
        if (!q) {
          return { error: "Provide a non-empty search query." };
        }
        try {
          return await webSearchCombined(q);
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Web search failed",
          };
        }
      },
    }),

    fetch_web_page: tool({
      description:
        "Fetch ONE public http(s) URL and return readable plain text (HTML tags stripped; no JavaScript execution). Use when the user pastes a link or needs the live contents of a specific page. Does not replace web_search for open-ended lookups. Private IPs, localhost, and non-standard ports are blocked.",
      inputSchema: z.object({
        url: z
          .string()
          .min(12)
          .describe("Full URL including scheme, e.g. https://example.com/article"),
      }),
      execute: async ({ url }) => {
        const u = url.trim();
        if (!u) {
          return { error: "Provide a non-empty URL." };
        }
        try {
          const result = await fetchWebPageContent(u);
          if (!result.ok) {
            return { error: result.error };
          }
          return {
            url: result.url,
            title: result.title,
            text: result.text,
            truncated: result.truncated,
            contentType: result.contentType,
            dataClassification: result.dataClassification,
          };
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Could not fetch page",
          };
        }
      },
    }),

    weather: tool({
      description: "Get current weather for a city using Open-Meteo (no API key).",
      inputSchema: z.object({
        city: z.string().min(1).describe("City name, e.g. Paris"),
      }),
      execute: async ({ city }) => {
        try {
          const name = city.trim();
          if (!name) {
            return { error: "Provide a city name." };
          }
          return await getWeather(name);
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    calendar_events_today: tool({
      description:
        "Read Apple Calendar events for today only (macOS EventKit). Prefer this tool when the user asks about “today”. If accessGranted is true, empty events means nothing scheduled today.",
      inputSchema: emptyToolInputSchema,
      execute: async () => {
        try {
          return await getCalendarEventsTodayWithHint();
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    calendar_events_range: tool({
      description:
        "Read Apple Calendar events between two instants (macOS EventKit). For “this week”, pass inclusive local dates as YYYY-MM-DD (start Monday, end Sunday). If accessGranted is true, empty events means nothing in range.",
      inputSchema: calendarRangeInputSchema,
      execute: async ({ startISO, endISO }) => {
        try {
          const bounds = parseCalendarRangeBounds(startISO, endISO);
          if (!bounds.ok) {
            return { events: [], hint: bounds.message };
          }
          return await getCalendarEventsRangeWithHint(
            bounds.start,
            bounds.end,
          );
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    calendar_create_event: tool({
      description: "Create an event on the default Apple Calendar (macOS EventKit).",
      inputSchema: z.object({
        title: z.string().min(1, "Title required"),
        startISO: z.string(),
        endISO: z.string(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        try {
          return await calendarCreateEvent(input);
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    file_search: tool({
      description:
        "Search local files on macOS using Spotlight (mdfind). Use name search by default.",
      inputSchema: z.object({
        query: z.string().min(1).describe("File name or Spotlight query"),
        searchType: z
          .string()
          .optional()
          .describe(
            'Optional: "name" (default) or "content" — name uses mdfind -name; content runs a full Spotlight query.',
          ),
      }),
      execute: async ({ query, searchType }) => {
        try {
          const byContent =
            (searchType ?? "").trim().toLowerCase() === "content";
          const hits = byContent
            ? await spotlightContent(query)
            : await spotlightByName(query);
          return { files: hits };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    screenshot: tool({
      description:
        "Capture the main display to a PNG (macOS screencapture). Saves `.jarvix-data/last-screenshot.png` beside the project (or your configured data dir) — full image is not embedded in the tool response (token limits). Confirm success and describe or ask the user to open that file or paste a screenshot if pixel detail is required.",
      inputSchema: emptyToolInputSchema,
      execute: async () => {
        try {
          return await captureScreenshotForAssistantTool();
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),

    ...(memoryEnabled
      ? {
          remember_user_note: tool({
            description:
              "Persist one short, durable fact about this user for future chats (name, long-term preferences, how they want you to behave). Call only when the user clearly shared something worth recalling later — not for one-off tasks, secrets/passwords, or obvious transient context. One fact per call; skip when unsure.",
            inputSchema: z.object({
              fact: z
                .string()
                .min(8)
                .max(200)
                .describe("Single concise fact, first person or neutral phrasing"),
            }),
            execute: async ({ fact }) => {
              try {
                const normalized = normalizeFact(fact);
                if (normalized.length < 6) {
                  return { saved: false as const, reason: "too_short" };
                }
                const key = normalized.toLowerCase();
                const existing = await getMemory();
                const dup = existing.some(
                  (m) => normalizeFact(m.fact).toLowerCase() === key,
                );
                if (dup) {
                  return { saved: false as const, reason: "duplicate" };
                }
                const entry = await addMemory(normalized);
                if (!entry) {
                  return { saved: false as const, reason: "rejected" };
                }
                return { saved: true as const, id: entry.id };
              } catch (e) {
                return {
                  saved: false as const,
                  reason: "error" as const,
                  detail:
                    e instanceof Error ? e.message : "Could not save memory",
                };
              }
            },
          }),
        }
      : {}),
  };
}

export type JarvixToolSet = ReturnType<typeof createJarvixToolset>;
