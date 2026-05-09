import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function getMarkerPath(installDir: string): string {
  return path.join(installDir, ".update-ready");
}

function normalizeGitRev(s: string | undefined): string {
  const t = (s ?? "").trim().toLowerCase();
  if (!t || t === "unknown") return "";
  return t.length >= 7 ? t.slice(0, 7) : t;
}

async function readCheckoutHeadRev(installDir: string): Promise<string | null> {
  if (!fs.existsSync(path.join(installDir, ".git"))) return null;
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      installDir,
      "rev-parse",
      "--short",
      "HEAD",
    ]);
    const h = stdout.trim().toLowerCase();
    return h.length >= 7 ? h.slice(0, 7) : h || null;
  } catch {
    return null;
  }
}

/**
 * Removes a stale `.update-ready` marker when this process was built from the
 * same git revision as the checkout on disk (user already restarted or updated
 * manually). While a staged update is pending, disk HEAD differs from this
 * process's inlined NEXT_PUBLIC_JARVIX_GIT_REV.
 */
async function reconcileStaleMarker(
  installDir: string,
  markerPath: string,
): Promise<boolean> {
  const runningRev = normalizeGitRev(process.env.NEXT_PUBLIC_JARVIX_GIT_REV);
  if (!runningRev) return fs.existsSync(markerPath);

  const headRev = await readCheckoutHeadRev(installDir);
  if (!headRev || runningRev !== headRev) {
    return true;
  }

  try {
    fs.rmSync(markerPath, { force: true });
  } catch {
    /* ignore — still treat as no longer pending */
  }
  return false;
}

export async function GET() {
  try {
    const installDir = getJarvixInstallDir();
    const markerPath = getMarkerPath(installDir);
    if (!fs.existsSync(markerPath)) {
      return NextResponse.json({ ready: false });
    }

    const ready = await reconcileStaleMarker(installDir, markerPath);
    return NextResponse.json({ ready });
  } catch {
    return NextResponse.json({ ready: false });
  }
}
