import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { requireDarwin } from "./mac-only";

export type FileHit = { name: string; path: string; modified?: string };

function runMdfind(args: string[], timeoutMs = 12_000): Promise<string> {
  requireDarwin("Spotlight file search");

  return new Promise((resolve, reject) => {
    const proc = spawn("mdfind", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("mdfind timed out"));
    }, timeoutMs);
    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    proc.stderr.on("data", (d) => {
      err += d.toString();
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(
        e && typeof e === "object" && "code" in e && e.code === "ENOENT"
          ? new Error("mdfind not found (needs macOS).")
          : e,
      );
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null && !out.trim()) {
        reject(new Error(err.trim() || `mdfind exited with code ${code}`));
        return;
      }
      resolve(out);
    });
  });
}

async function withModified(hits: FileHit[]): Promise<FileHit[]> {
  return Promise.all(
    hits.map(async (h) => {
      try {
        const stat = await fs.stat(h.path);
        return {
          ...h,
          modified: stat.mtime.toISOString(),
        };
      } catch {
        return h;
      }
    }),
  );
}

export async function spotlightByName(query: string): Promise<FileHit[]> {
  const q = query.trim().slice(0, 512);
  if (!q) return [];
  const raw = await runMdfind(["-name", q]);
  const lines = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  const hits = lines.map((filePath) => {
    const segments = filePath.split("/");
    return { name: segments[segments.length - 1] || filePath, path: filePath };
  });
  return withModified(hits);
}

export async function spotlightContent(query: string): Promise<FileHit[]> {
  const q = query.trim().slice(0, 512);
  if (!q) return [];
  const raw = await runMdfind([q]);
  const lines = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  const hits = lines.map((filePath) => {
    const segments = filePath.split("/");
    return { name: segments[segments.length - 1] || filePath, path: filePath };
  });
  return withModified(hits);
}
