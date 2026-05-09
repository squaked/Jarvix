import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import fs from "node:fs";
import path from "node:path";

function getMarkerPath(installDir: string): string {
  return path.join(installDir, ".update-ready");
}

/**
 * Normalize a git revision to a 7-char lowercase prefix.
 * Returns "" for missing / "unknown" values.
 */
function normalizeRev(s: string | undefined): string {
  const t = (s ?? "").trim().toLowerCase();
  if (!t || t === "unknown") return "";
  return t.length >= 7 ? t.slice(0, 7) : t;
}

/**
 * Reads the target revision from the `.update-ready` marker file.
 * The marker may contain just a rev hash (written by update.sh) or be empty
 * (legacy / manual touch). Returns "" if the file is empty or unreadable.
 */
function readMarkerTargetRev(markerPath: string): string {
  try {
    const content = fs.readFileSync(markerPath, "utf8").trim();
    return normalizeRev(content);
  } catch {
    return "";
  }
}

/**
 * Check whether `.update-ready` represents a genuinely pending update.
 *
 * The marker contains the NEW revision that was built. We compare it against
 * this process's build-time rev (`NEXT_PUBLIC_JARVIX_GIT_REV`).
 *
 * - If the marker's target rev matches the running rev → the user already
 *   restarted (or updated manually). The marker is stale — delete it.
 * - If they differ (or either is unknown) → the update is genuinely pending.
 *
 * This approach requires NO git commands at poll time — just a file read and
 * a string comparison — which makes it fast and impossible to break.
 */
function isUpdateGenuinelyPending(markerPath: string): boolean {
  const markerRev = readMarkerTargetRev(markerPath);
  const runningRev = normalizeRev(process.env.NEXT_PUBLIC_JARVIX_GIT_REV);

  // If the marker is empty (legacy / manual touch) or we don't know the
  // running rev, we can't reconcile — assume the update is genuine.
  if (!markerRev || !runningRev) return true;

  // If they match, the update was already applied → clean up the stale marker.
  if (markerRev === runningRev) {
    try {
      fs.rmSync(markerPath, { force: true });
    } catch {
      /* ignore */
    }
    return false;
  }

  // Revs differ → update is genuinely pending.
  return true;
}

export async function GET() {
  try {
    const installDir = getJarvixInstallDir();
    const markerPath = getMarkerPath(installDir);

    if (!fs.existsSync(markerPath)) {
      return NextResponse.json({ ready: false });
    }

    const ready = isUpdateGenuinelyPending(markerPath);
    return NextResponse.json({ ready });
  } catch {
    // On any error, assume no update to avoid phantom banners.
    return NextResponse.json({ ready: false });
  }
}
