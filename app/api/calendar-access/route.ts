import {
  isEventKitHelperInstalled,
  helperAuthStatus,
} from "@/lib/eventkit-helper-client";
import { isCalendarReadAllowedStatus } from "@/lib/tool-runners/eventkit";

export const runtime = "nodejs";

/**
 * Read-only check of whether macOS has granted calendar access yet.
 * Distinct from POST /api/open-calendars-privacy, which actively requests
 * access and opens System Settings. Used by onboarding / Settings to show
 * a live "Granted / Not granted" badge without surfacing a permission prompt.
 *
 * Checks both the Jarvix helper (if built) and the Node/eventkit-node path:
 * either may be allowed in Privacy → Calendars — both are used for reads.
 */
export async function GET() {
  let helper: { status: string; granted: boolean } | undefined;
  if (isEventKitHelperInstalled()) {
    try {
      const status = await helperAuthStatus();
      helper = { status, granted: isCalendarReadAllowedStatus(status) };
    } catch {
      /* ignore */
    }
  }

  let eventkitNode: { status: string; granted: boolean } | undefined;
  try {
    const ek = await import("eventkit-node");
    let status = "unknown";
    try {
      status = String(ek.getAuthorizationStatus("event"));
    } catch {
      /* keep "unknown" */
    }
    eventkitNode = { status, granted: isCalendarReadAllowedStatus(status) };
  } catch {
    /* native addon missing */
  }

  const granted = Boolean(helper?.granted || eventkitNode?.granted);
  const status = (() => {
    if (granted) {
      if (helper?.granted) return helper.status;
      return eventkitNode?.status ?? "unknown";
    }
    if (helper && eventkitNode) {
      return `helper: ${helper.status}; node: ${eventkitNode.status}`;
    }
    return helper?.status ?? eventkitNode?.status ?? "eventkit unavailable";
  })();

  const source =
    helper?.granted && eventkitNode?.granted
      ? "helper+eventkit-node"
      : helper?.granted
        ? "helper"
        : eventkitNode?.granted
          ? "eventkit-node"
          : helper
            ? "helper"
            : eventkitNode
              ? "eventkit-node"
              : "none";

  return Response.json({
    granted,
    status,
    source,
    helper,
    eventkitNode,
  });
}
