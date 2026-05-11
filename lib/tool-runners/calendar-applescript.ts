import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { CalendarEventBrief } from "./eventkit";

const execFileAsync = promisify(execFile);

/**
 * Fallback when native EventKit is unavailable or declined.
 * Supports date range.
 */
export async function calendarEventsRangeAppleScript(
  start: Date,
  end: Date,
): Promise<CalendarEventBrief[]> {
  if (process.platform !== "darwin") return [];

  const startSecs = Math.floor(start.getTime() / 1000);
  const endSecs = Math.floor(end.getTime() / 1000);

  const script = `
on pad2(n as integer)
	set t to n as text
	if (length of t) < 2 then set t to "0" & t
	return t
end pad2

on isoFromDate(dt)
	try
		set y to year of dt as integer
		set m to month of dt as integer
		set d to day of dt as integer
		set secs to time of dt
		set hh to secs div 3600
		set rem to secs mod 3600
		set mm to rem div 60
		set ss to rem mod 60
		return (y as text) & "-" & my pad2(m) & "-" & my pad2(d) & "T" & my pad2(hh) & ":" & my pad2(mm) & ":" & my pad2(ss)
	end try
	return ""
end isoFromDate

on run
	set delim to ASCII character 31
	set outText to ""
	
	-- Hack to set dates from unix timestamps in AppleScript
	set rangeStart to (POSIX date 0) + ${startSecs}
	set rangeEnd to (POSIX date 0) + ${endSecs}

	tell application "Calendar"
		repeat with acal in calendars
			try
				repeat with ev in (every event of acal whose start date is greater than or equal to rangeStart and start date is less than rangeEnd)
					set t to ""
					try
						set t to summary of ev
					end try
					if t is missing value then set t to ""
					set cn to ""
					try
						set cn to name of acal
					end try
					if cn is missing value then set cn to ""
					set sd to my isoFromDate(start date of ev)
					set ed to my isoFromDate(end date of ev)
					if sd is "" or ed is "" then
					else
						set outText to outText & t & delim & sd & delim & ed & delim & cn & ASCII character 10
					end if
				end repeat
			end try
		end repeat
	end tell
	return outText as string
end run
`;

  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "AppleScript", "-e", script],
      { encoding: "utf8", timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
    );

    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const sep = String.fromCharCode(31);
    const out: CalendarEventBrief[] = [];
    for (const line of lines) {
      const parts = line.split(sep);
      if (parts.length < 4) continue;
      const [title, start, end, calendar] = parts.map((x) =>
        x.trim().replace(/\s+/g, " "),
      );
      const s = Date.parse(`${start}`);
      const e = Date.parse(`${end}`);
      if (Number.isNaN(s) || Number.isNaN(e)) continue;
      out.push({
        title: title || "(untitled)",
        start: new Date(s).toISOString(),
        end: new Date(e).toISOString(),
        calendar: calendar || "?",
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Fallback when native EventKit is unavailable or declined.
 * May prompt Automation for Calendar.app (separate from EventKit in Privacy).
 */
export async function calendarEventsTodayAppleScript(): Promise<
  CalendarEventBrief[]
> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(24, 0, 0, 0);
  return calendarEventsRangeAppleScript(start, end);
}
