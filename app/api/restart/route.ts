import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function getMarkerPath(): string {
  const installDir =
    process.env.JARVIX_INSTALL_DIR ||
    path.join(process.env.HOME ?? "", ".jarvix-app");
  return path.join(installDir, ".update-ready");
}

export async function POST() {
  // Remove the marker so the banner doesn't reappear after restart.
  try {
    fs.rmSync(getMarkerPath(), { force: true });
  } catch {
    // ignore — marker may already be gone
  }

  // Exit after the response is flushed. The LaunchAgent's KeepAlive restarts
  // the process automatically, picking up the already-built .next folder.
  setTimeout(() => process.exit(0), 500);

  return NextResponse.json({ restarting: true });
}
