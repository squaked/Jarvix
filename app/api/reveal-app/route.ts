import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import { exec } from "node:child_process";
import path from "node:path";
import os from "node:os";

export async function POST() {
  const homeDir = os.homedir();
  const appPath = path.join(homeDir, "Applications", "Jarvix.app");

  // Use 'open -R' to reveal the app in Finder and select it.
  // This makes it easy for the user to drag it into the Dock.
  exec(`open -R "${appPath}"`, (error) => {
    if (error) {
      console.error("Failed to reveal app in Finder:", error);
    }
  });

  return NextResponse.json({ success: true });
}
