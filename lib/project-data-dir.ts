import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NEW_DATA_DIR = ".jarvix-data";
const LEGACY_DATA_DIR = ".jarvis-data";

/**
 * Default data directory on hosts where the deployed tree is read-only (Netlify/AWS Lambda/etc.).
 * Writable but not durable across instances or cold starts — see .env.example.
 */
function defaultServerlessDataDir(): string {
  return path.join(os.tmpdir(), "jarvix-data");
}

function prefersEphemeralJarvixDataDir(): boolean {
  const flag = process.env.JARVIX_USE_TMP_DATA_DIR?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV,
  );
}

/** All Jarvix filesystem state lives here (inside the repo by default). */
export function getJarvixProjectDataDir(): string {
  const override =
    process.env.JARVIX_DATA_DIR?.trim() || process.env.JARVIS_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  if (prefersEphemeralJarvixDataDir()) return defaultServerlessDataDir();

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
