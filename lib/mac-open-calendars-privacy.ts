import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Try newer Settings deep link first (Ventura+), then legacy pane. */
const CALENDARS_PRIVACY_URLS = [
  "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Calendars",
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars",
] as const;

export async function openCalendarsPrivacySettings(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (process.platform !== "darwin") {
    return { ok: false, error: "This shortcut only works on macOS." };
  }

  let lastErr: unknown;
  for (const url of CALENDARS_PRIVACY_URLS) {
    try {
      await execFileAsync("/usr/bin/open", [url]);
      return { ok: true };
    } catch (e) {
      lastErr = e;
    }
  }

  return {
    ok: false,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  };
}
