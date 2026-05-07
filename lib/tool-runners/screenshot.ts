import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getJarvixProjectDataDir } from "@/lib/project-data-dir";
import { requireDarwin } from "./mac-only";

export async function captureScreenshotToBase64(): Promise<{
  base64: string;
  mimeType: "image/png";
}> {
  requireDarwin("Screenshot capture");
  const file = path.join(os.tmpdir(), `jarvix-screenshot-${randomUUID()}.png`);
  await new Promise<void>((resolve, reject) => {
    const p = spawn("screencapture", ["-x", file]);
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`screencapture exited ${code}`));
    });
  });

  try {
    const buf = await fs.readFile(file);
    return {
      base64: buf.toString("base64"),
      mimeType: "image/png",
    };
  } finally {
    await fs.unlink(file).catch(() => undefined);
  }
}

/** Saves PNG beside the project — safe to return through the chat tool (no megabyte base64 in context). */
export async function captureScreenshotForAssistantTool(): Promise<{
  ok: true;
  mimeType: "image/png";
  bytes: number;
  saved_relative_path: string;
  note: string;
}> {
  requireDarwin("Screenshot capture");
  const tmp = path.join(os.tmpdir(), `jarvix-screenshot-${randomUUID()}.png`);
  await new Promise<void>((resolve, reject) => {
    const p = spawn("screencapture", ["-x", tmp]);
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`screencapture exited ${code}`));
    });
  });

  try {
    const buf = await fs.readFile(tmp);
    const dir = getJarvixProjectDataDir();
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const dest = path.join(dir, "last-screenshot.png");
    await fs.writeFile(dest, buf, { mode: 0o600 });
    const rel =
      path.relative(process.cwd(), dest) || path.join(dir, "last-screenshot.png");
    return {
      ok: true,
      mimeType: "image/png",
      bytes: buf.length,
      saved_relative_path: rel,
      note: "PNG saved on disk. Full pixels are not embedded in this message—open the file locally or paste a screenshot into chat if the model must analyze pixels.",
    };
  } finally {
    await fs.unlink(tmp).catch(() => undefined);
  }
}
