import { NextResponse } from "next/server";
import {
  clearSettingsFile,
  readSettingsFile,
  updateSettingsFile,
} from "@/lib/settings-file-store";
import type { Settings } from "@/lib/types";

export async function GET() {
  const settings = await readSettingsFile();
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Settings> & {
      clear?: boolean;
    };

    if (body.clear === true) {
      const cleared = await clearSettingsFile();
      return NextResponse.json(cleared);
    }

    const { clear: _, ...patch } = body;
    const next = await updateSettingsFile(patch as Partial<Settings>);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
