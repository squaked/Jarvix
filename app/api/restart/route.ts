import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export async function POST() {
  const installDir = getJarvixInstallDir();
  const markerPath = path.join(installDir, ".update-ready");
  const relaunchScript = path.join(installDir, "scripts", "relaunch.sh");

  // Clear the marker so the banner doesn't reappear after restart.
  try {
    fs.rmSync(markerPath, { force: true });
  } catch {
    // ignore — marker may already be gone
  }

  // Spawn the detached relauncher BEFORE we exit. It waits for this
  // process to release port 3000, then starts a fresh `npm start`.
  // Without this, the LaunchAgent (KeepAlive=false) and the Jarvix.app
  // launcher would both treat the exit as a final shutdown.
  try {
    if (fs.existsSync(relaunchScript)) {
      const child = spawn(relaunchScript, [], {
        detached: true,
        stdio: "ignore",
        cwd: installDir,
        env: {
          ...process.env,
          JARVIX_INSTALL_DIR: installDir,
        },
      });
      child.unref();
    }
  } catch {
    // If we can't spawn the relauncher we still exit; the user can
    // re-open Jarvix.app from the Dock and the LaunchAgent will start it.
  }

  // Give the response a beat to flush, then exit so the new server can
  // bind port 3000.
  setTimeout(() => process.exit(0), 500);

  return NextResponse.json({ restarting: true });
}
