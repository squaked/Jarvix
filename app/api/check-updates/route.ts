import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const exec = promisify(execFile);

type CheckResult =
  | { upToDate: true }
  | { upToDate: false; building: true; alreadyRunning?: boolean }
  | { upToDate: false; ready: true }
  | { error: string };

export async function POST(): Promise<NextResponse<CheckResult>> {
  const installDir = getJarvixInstallDir();
  const updateScript = path.join(installDir, "scripts", "update.sh");
  const lockDir = path.join(installDir, ".update.lock");
  const readyMarker = path.join(installDir, ".update-ready");

  // Already-built update sitting on disk waiting for the user to restart.
  if (fs.existsSync(readyMarker)) {
    return NextResponse.json({ upToDate: false, ready: true });
  }

  // Sanity-check that we're operating on a git checkout — otherwise the
  // git commands below will fail with a confusing "not a git repo" 500.
  if (!fs.existsSync(path.join(installDir, ".git"))) {
    return NextResponse.json(
      { error: "Jarvix isn't installed as a git checkout — auto-update is disabled." },
      { status: 400 },
    );
  }

  try {
    await exec("git", ["-C", installDir, "fetch", "origin"], {
      timeout: 15_000,
    });

    const { stdout: countStr } = await exec(
      "git",
      ["-C", installDir, "rev-list", "HEAD..origin/main", "--count"],
      { timeout: 5_000 },
    );

    const upToDate = parseInt(countStr.trim(), 10) === 0;
    if (upToDate) {
      return NextResponse.json({ upToDate });
    }

    // Don't double-spawn if the LaunchAgent run is already in progress.
    const alreadyRunning = fs.existsSync(lockDir);

    if (!alreadyRunning && fs.existsSync(updateScript)) {
      const logFile = fs.openSync(path.join(installDir, "logs", "update.log"), "a");
      const child = spawn(updateScript, [], {
        detached: true,
        stdio: ["ignore", logFile, logFile],
        cwd: installDir,
        env: { ...process.env, JARVIX_INSTALL_DIR: installDir },
      });
      child.unref();
    }

    return NextResponse.json({
      upToDate: false,
      building: true,
      ...(alreadyRunning ? { alreadyRunning: true } : {}),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Check failed" },
      { status: 500 },
    );
  }
}
