import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type CalendarEventRow = {
  title: string;
  start: string;
  end: string;
  calendar: string;
};

type HelperResult = Record<string, unknown> & { ok?: boolean; error?: string };

export function resolveEventKitHelperExecutable(): string | null {
  const fromEnv = process.env.JARVIX_EVENTKIT_HELPER?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const rel = path.join(
    process.cwd(),
    "scripts/macos/JarvixEventKitHelper/JarvixEventKitHelper.app/Contents/MacOS/JarvixEventKitHelper",
  );
  if (fs.existsSync(rel)) return rel;
  return null;
}

export function isEventKitHelperInstalled(): boolean {
  return resolveEventKitHelperExecutable() !== null;
}

let ensureChain: Promise<void> = Promise.resolve();

export async function ensureEventKitHelperBuilt(): Promise<void> {
  if (resolveEventKitHelperExecutable()) return;
  if (process.platform !== "darwin") return;

  const script = path.join(
    process.cwd(),
    "scripts/macos/JarvixEventKitHelper/build.sh",
  );
  if (!fs.existsSync(script)) return;

  ensureChain = ensureChain.then(async () => {
    if (resolveEventKitHelperExecutable()) return;
    try {
      await execFileAsync("/bin/bash", [script], {
        cwd: path.dirname(script),
        timeout: 300_000,
      });
    } catch {
      /* swiftc / Xcode CLT may be missing */
    }
  });
  await ensureChain;
}

async function invoke(payload: Record<string, unknown>): Promise<HelperResult> {
  await ensureEventKitHelperBuilt();
  const exe = resolveEventKitHelperExecutable();
  if (!exe) {
    return { ok: false, error: "Jarvix EventKit helper is not built" };
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(exe, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const t = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("EventKit helper timed out"));
    }, 120_000);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr?.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve({
          ok: false,
          error: stderr.trim() || `helper exited ${code ?? "unknown"} with no output`,
        });
        return;
      }
      try {
        resolve(JSON.parse(trimmed) as HelperResult);
      } catch {
        resolve({
          ok: false,
          error: `invalid JSON from helper: ${trimmed.slice(0, 200)}`,
        });
      }
    });
    child.stdin?.write(`${JSON.stringify(payload)}\n`);
    child.stdin?.end();
  });
}

function assertOk(res: HelperResult): void {
  if (res.ok === false) {
    throw new Error(typeof res.error === "string" ? res.error : "EventKit helper failed");
  }
}

export async function helperAuthStatus(): Promise<string> {
  const res = await invoke({ op: "authStatus" });
  assertOk(res);
  return String(res.status ?? "unknown");
}

export async function helperRequestAccess(): Promise<{ granted: boolean; status: string }> {
  const res = await invoke({ op: "requestAccess" });
  assertOk(res);
  return {
    granted: Boolean(res.granted),
    status: String(res.status ?? "unknown"),
  };
}

export async function helperEventsInRange(
  start: Date,
  end: Date,
): Promise<CalendarEventRow[]> {
  const fmt = (d: Date) => d.toISOString();
  const res = await invoke({
    op: "eventsInRange",
    start: fmt(start),
    end: fmt(end),
  });
  assertOk(res);
  const events = res.events;
  if (!Array.isArray(events)) return [];
  return events.map((row) => {
    const o = row as Record<string, unknown>;
    return {
      title: String(o.title ?? ""),
      start: String(o.start ?? ""),
      end: String(o.end ?? ""),
      calendar: String(o.calendar ?? ""),
    };
  });
}

export async function helperSaveEvent(input: {
  title: string;
  startISO: string;
  endISO: string;
  notes?: string;
}): Promise<{ id: string }> {
  const res = await invoke({
    op: "saveEvent",
    title: input.title,
    startISO: input.startISO,
    endISO: input.endISO,
    notes: input.notes,
  });
  assertOk(res);
  const id = res.id;
  if (typeof id !== "string" || !id) {
    throw new Error("EventKit helper did not return an event id");
  }
  return { id };
}
