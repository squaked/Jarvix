import { app, BrowserWindow, Menu, shell } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import * as fs from "node:fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { spawn } from "node:child_process";

/** Must match `scripts/jarvix.port` (fallback if the file is missing). */
const DEFAULT_HTTP_PORT = 52741;

function resolveInstallDir(): string {
  return process.env.JARVIX_INSTALL_DIR ?? path.join(os.homedir(), ".jarvix-app");
}

function httpPort(): number {
  const env = process.env.JARVIX_HTTP_PORT?.trim();
  if (env && /^\d+$/.test(env)) {
    const n = Number.parseInt(env, 10);
    if (n >= 1 && n <= 65535) return n;
  }
  // Order matters when packaged: cwd may be "/" or unrelated — only consult it
  // during unpackaged dev (npm run electron:dev).
  const roots: string[] = [];
  const inst = process.env.JARVIX_INSTALL_DIR?.trim();
  if (inst) roots.push(inst);
  roots.push(path.join(os.homedir(), ".jarvix-app"));
  if (!app.isPackaged) {
    roots.push(process.cwd());
  }

  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root)) continue;
    seen.add(root);
    const portFile = path.join(root, "scripts", "jarvix.port");
    try {
      const raw = fs.readFileSync(portFile, "utf8").trim().split(/\s+/)[0];
      if (raw && /^\d+$/.test(raw)) {
        const n = Number.parseInt(raw, 10);
        if (n >= 1 && n <= 65535) return n;
      }
    } catch {
      // try next root
    }
  }
  return DEFAULT_HTTP_PORT;
}

const PORT = httpPort();
const SERVER_URL = `http://127.0.0.1:${PORT}`;

let mainWindow: BrowserWindow | null = null;
let reconnectTimer: ReturnType<typeof setInterval> | null = null;

// ── Single instance ──────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  // On macOS, keep the app alive when all windows are closed (standard behavior).
  // The Next.js server continues independently via LaunchAgent.
  app.on("window-all-closed", () => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

// ── Server health check ──────────────────────────────────────────────────────
function isServerUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(SERVER_URL, (res) => {
      res.resume();
      resolve(typeof res.statusCode === "number" && res.statusCode < 500);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function waitForServer(maxMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isServerUp()) return true;
    await new Promise<void>((r) => setTimeout(r, 600));
  }
  return false;
}

// ── Loading screen ───────────────────────────────────────────────────────────
// Renders a minimal dark splash page while the Next.js server is warming up.
function loadingPage(label = "Starting Jarvix\u2026"): string {
  const safe = label.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c)
  );
  return (
    "data:text/html;charset=utf-8," +
    encodeURIComponent(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0a0a0a;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;
     justify-content:center;gap:14px;color:#666;
     font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
     -webkit-app-region:drag}
.dots{display:flex;gap:7px}
.dot{width:6px;height:6px;border-radius:50%;background:#555;
     animation:p 1.2s ease-in-out infinite}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
@keyframes p{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
.lbl{font-size:13px;letter-spacing:.01em}
</style></head>
<body>
<div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
<div class="lbl">${safe}</div>
</body></html>`)
  );
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 820,
    minHeight: 580,
    backgroundColor: "#0a0a0a",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  setupMenu();

  void mainWindow.loadURL(loadingPage());
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Open target="_blank" and window.open() links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // Detect server going offline (relaunch.sh restart gap, or /api/quit)
  mainWindow.webContents.on("did-fail-load", (_e, code, _desc, url) => {
    if (url.startsWith(SERVER_URL) && isConnectionRefused(code)) {
      beginReconnect();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    clearReconnect();
  });

  void bootConnect();
}

// ── Install dir + server spawning ────────────────────────────────────────────
// Electron does not bundle the Next.js server; LaunchAgent and/or launcher.sh
// start it. JARVIX_INSTALL_DIR is set by the LaunchAgent; the Dock uses ~/.jarvix-app.
function ensureServerRunning(): void {
  const dir = resolveInstallDir();
  const launcherScript = path.join(dir, "scripts", "macos", "launcher.sh");
  // launcher.sh is idempotent: it exits immediately if our HTTP port is
  // already listening, so it's safe to call unconditionally.
  const child = spawn("/bin/bash", [launcherScript], {
    detached: true,
    stdio: "ignore",
    cwd: dir,
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin:${process.env.PATH ?? ""}`,
      JARVIX_INSTALL_DIR: dir,
      JARVIX_HTTP_PORT: String(PORT),
      PORT: String(PORT),
    },
  });
  child.unref();
}

async function bootConnect(): Promise<void> {
  // Quick check first — if the LaunchAgent already started the server, connect
  // straight away without the launcher.sh overhead.
  if (await isServerUp()) {
    mainWindow?.loadURL(SERVER_URL);
    return;
  }

  // Server isn't up yet — spawn launcher.sh to start it, then wait.
  ensureServerRunning();

  if (await waitForServer(90_000)) {
    mainWindow?.loadURL(SERVER_URL);
  } else {
    mainWindow?.loadURL(
      loadingPage("Server unavailable \u2014 try restarting Jarvix.")
    );
  }
}

// ── Auto-reconnect after server restart (relaunch.sh gap) ───────────────────
function isConnectionRefused(code: number): boolean {
  // ERR_CONNECTION_REFUSED / ERR_ADDRESS_UNREACHABLE / ERR_TIMED_OUT
  return code === -102 || code === -106 || code === -7;
}

// How long to keep trying before giving up. Chosen to comfortably outlast a
// full relaunch.sh restart cycle (~5–35 s) while not looping forever after
// the user intentionally quits the server from the settings page.
const RECONNECT_MAX_MS = 70_000;

function beginReconnect(): void {
  if (reconnectTimer) return;
  mainWindow?.loadURL(loadingPage("Restarting\u2026"));
  const deadline = Date.now() + RECONNECT_MAX_MS;
  reconnectTimer = setInterval(async () => {
    if (!mainWindow) {
      clearReconnect();
      return;
    }
    if (await isServerUp()) {
      clearReconnect();
      void mainWindow.loadURL(SERVER_URL);
      return;
    }
    if (Date.now() >= deadline) {
      // Server didn't come back — the user quit intentionally or it crashed.
      // Close the Electron window so the app exits cleanly.
      clearReconnect();
      app.quit();
    }
  }, 1000);
}

function clearReconnect(): void {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
}

// ── Application menu ─────────────────────────────────────────────────────────
function setupMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
