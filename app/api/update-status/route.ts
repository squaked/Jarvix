import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function getMarkerPath(): string {
  const installDir =
    process.env.JARVIX_INSTALL_DIR ||
    path.join(process.env.HOME ?? "", ".jarvix-app");
  return path.join(installDir, ".update-ready");
}

export async function GET() {
  try {
    const ready = fs.existsSync(getMarkerPath());
    return NextResponse.json({ ready });
  } catch {
    return NextResponse.json({ ready: false });
  }
}
