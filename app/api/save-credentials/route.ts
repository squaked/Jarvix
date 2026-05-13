import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json();
    if (!filename || !content) {
      return NextResponse.json({ error: "Missing filename or content" }, { status: 400 });
    }

    // Use a hidden data directory in the user's home folder or project root
    // For Jarvix, we'll use a consistent path
    const dataDir = join(process.cwd(), ".jarvix-data", "credentials");
    
    await mkdir(dataDir, { recursive: true });
    const filePath = join(dataDir, filename);
    
    await writeFile(filePath, content, "utf8");
    
    return NextResponse.json({ path: filePath });
  } catch (e) {
    console.error("Failed to save credentials:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
