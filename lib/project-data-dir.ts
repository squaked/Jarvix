import fs from "node:fs";
import path from "node:path";

const NEW_DATA_DIR = ".jarvix-data";
const LEGACY_DATA_DIR = ".jarvis-data";

/** All Jarvix filesystem state lives here (inside the repo by default). */
export function getJarvixProjectDataDir(): string {
  const override =
    process.env.JARVIX_DATA_DIR?.trim() || process.env.JARVIS_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  const cwd = process.cwd();
  const nextPath = path.join(cwd, NEW_DATA_DIR);
  const legacyPath = path.join(cwd, LEGACY_DATA_DIR);
  try {
    if (fs.existsSync(nextPath)) return nextPath;
    if (fs.existsSync(legacyPath)) return legacyPath;
  } catch {
    /* noop */
  }
  return nextPath;
}
