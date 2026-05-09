import { getCalendarEventsTodayWithHint } from "@/lib/tool-runners/eventkit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 
 * Server-side memory cache. 
 * Since the server process stays alive (LaunchAgent), this avoids re-running 
 * the slow AppleScript helper more than once every few minutes.
 */
let cache: { t: number; data: any } | null = null;
const SERVER_CACHE_TTL_MS = 10_000; // 10 seconds (enough for deduping, but feels real-time)

export async function GET() {
  if (cache && Date.now() - cache.t < SERVER_CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const result = await getCalendarEventsTodayWithHint();
    cache = { t: Date.now(), data: result };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { events: [], hint: String(err), accessGranted: false },
      { status: 200 },
    );
  }
}
