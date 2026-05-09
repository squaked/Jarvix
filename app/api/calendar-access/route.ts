import { isEventKitHelperInstalled, helperAuthStatus } from "@/lib/eventkit-helper-client";

export const runtime = "nodejs";

/**
 * Read-only check of whether macOS has granted calendar access yet.
 * Distinct from POST /api/open-calendars-privacy, which actively requests
 * access and opens System Settings. Used by onboarding / Settings to show
 * a live "Granted / Not granted" badge without surfacing a permission prompt.
 */
export async function GET() {
  // 1. Prefer the small Jarvix EventKit helper (shows up as "Jarvix" in
  //    Privacy & Security). It's the only path that reflects the user's
  //    real choice when they granted access to "Jarvix" specifically.
  if (isEventKitHelperInstalled()) {
    try {
      const status = await helperAuthStatus();
      const granted = status === "fullAccess" || status === "authorized";
      return Response.json({
        granted,
        status,
        source: "helper",
      });
    } catch {
      /* fall through */
    }
  }

  // 2. Fall back to the embedded eventkit-node addon (perm shows up as
  //    whichever process started the server, e.g. Terminal/Cursor/Node).
  try {
    const ek = await import("eventkit-node");
    let status = "unknown";
    try {
      status = String(ek.getAuthorizationStatus("event"));
    } catch {
      /* keep "unknown" */
    }
    const granted = status === "fullAccess" || status === "authorized";
    return Response.json({
      granted,
      status,
      source: "eventkit-node",
    });
  } catch {
    return Response.json({
      granted: false,
      status: "eventkit unavailable",
      source: "none",
    });
  }
}
