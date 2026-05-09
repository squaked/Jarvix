import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Resolved directory for git checkout, bundled scripts, `.update-ready`, etc.
 * LaunchAgent/install set `JARVIX_INSTALL_DIR`. In dev, fall back to the repo
 * root on disk when `cwd` is inside this project so `.update-ready` matches
 * `scripts/update.sh` (which touches `$INSTALL_DIR/.update-ready`).
 */
export function getJarvixInstallDir(): string {
  const fromEnv = process.env.JARVIX_INSTALL_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  if (process.env.NODE_ENV === "development") {
    const checkout = findCheckoutRootContainingUpdateScript(process.cwd());
    if (checkout) return checkout;
  }

  return path.join(os.homedir(), ".jarvix-app");
}

function findCheckoutRootContainingUpdateScript(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    const updateScript = path.join(dir, "scripts", "update.sh");
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(updateScript) && fs.existsSync(pkg)) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
