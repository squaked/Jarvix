import { getCalendarEventsTodayWithHint } from "@/lib/tool-runners/eventkit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getCalendarEventsTodayWithHint();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { events: [], hint: String(err), accessGranted: false },
      { status: 200 },
    );
  }
}
