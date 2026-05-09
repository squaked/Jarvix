import { NextResponse } from "next/server";
import { getJarvixInstallDir } from "@/lib/jarvix-install-dir";
import fs from "node:fs";
import path from "node:path";

function getMarkerPath(): string {
  return path.join(getJarvixInstallDir(), ".update-ready");
}

export async function GET() {
  try {
    const ready = fs.existsSync(getMarkerPath());
    return NextResponse.json({ ready });
  } catch {
    return NextResponse.json({ ready: false });
  }
}
