import { NextResponse } from "next/server";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);

function getInstallDir(): string {
  return (
    process.env.JARVIX_INSTALL_DIR ||
    path.join(process.env.HOME ?? "", ".jarvix-app")
  );
}

export async function POST() {
  const installDir = getInstallDir();

  try {
    // Fetch remote refs — fast, no checkout.
    await exec("git", ["-C", installDir, "fetch", "origin"], {
      timeout: 15_000,
    });

    const { stdout: local } = await exec("git", ["-C", installDir, "rev-parse", "HEAD"]);
    const { stdout: remote } = await exec(
      "git",
      ["-C", installDir, "rev-parse", "@{u}"],
      { timeout: 5_000 },
    );

    const upToDate = local.trim() === remote.trim();

    if (!upToDate) {
      // Kick off the full update (pull + build + write .update-ready) in the background.
      // The UpdateBanner polls for .update-ready every 15 s and surfaces it automatically.
      const child = spawn(
        path.join(installDir, "scripts/update.sh"),
        [],
        { detached: true, stdio: "ignore" },
      );
      child.unref();
    }

    return NextResponse.json({ upToDate });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Check failed" },
      { status: 500 },
    );
  }
}
