import { NextResponse } from "next/server";

export async function POST() {
  // Exit after the response is flushed.
  // The Jarvix.app process sees the server stop and closes the Dock icon.
  setTimeout(() => process.exit(0), 500);
  return NextResponse.json({ quitting: true });
}
