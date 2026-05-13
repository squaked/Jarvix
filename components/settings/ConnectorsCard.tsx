"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useJarvixSettings } from "@/lib/settings";
import { useState, useEffect, useRef } from "react";
import type { McpConnector, InternalConnectorId } from "@/lib/types";

type Props = { onSaved: () => void };

const INTERNAL_LABELS: Record<InternalConnectorId, { name: string; desc: string; icon: string }> = {
  web_search: {
    name: "Web Search",
    desc: "Search the web (DuckDuckGo + Bing fallback) — not the same as opening a specific URL.",
    icon: "🌐",
  },
  fetch_web_page: {
    name: "Fetch web page",
    desc: "Read plain text from a single public link the user shares (no JavaScript).",
    icon: "🔗",
  },
  weather: {
    name: "Weather",
    desc: "Get live weather updates for any city.",
    icon: "🌤️",
  },
  calendar: {
    name: "Calendar",
    desc: "Read and manage your Apple Calendar events.",
    icon: "📅",
  },
  files: {
    name: "Local Files",
    desc: "Find and read files on your Mac via Spotlight.",
    icon: "📁",
  },
  screenshot: {
    name: "Screenshot",
    desc: "Capture your screen to help with visual tasks.",
    icon: "📸",
  },
};

export function ConnectorsCard({ onSaved }: Props) {
  const { settings, bootstrapped, saveSettings } = useJarvixSettings();
  const [view, setView] = useState<"list" | "add-choice" | "gmail-wizard" | "custom">("list");
  const [saving, setSaving] = useState(false);

  const connectors = settings.connectors || [];
  const internalConnectors = settings.internalConnectors || [];

  const toggleInternal = async (id: InternalConnectorId) => {
    const updated = internalConnectors.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    await saveSettings({ internalConnectors: updated });
    onSaved();
  };

  const [calendarStatus, setCalendarStatus] = useState<"granted" | "denied" | "checking">("checking");

  const checkCalendar = async () => {
    try {
      const res = await fetch("/api/calendar-access");
      const data = await res.json();
      setCalendarStatus(data.granted ? "granted" : "denied");
    } catch {
      setCalendarStatus("denied");
    }
  };

  useEffect(() => {
    if (bootstrapped) checkCalendar();
  }, [bootstrapped]);

  const toggleExternal = async (id: string) => {
    const updated = connectors.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    await saveSettings({ connectors: updated });
    onSaved();
  };

  const removeExternal = async (id: string) => {
    const updated = connectors.filter((c) => c.id !== id);
    await saveSettings({ connectors: updated });
    onSaved();
  };

  const addConnector = async (newConnector: Omit<McpConnector, "id">) => {
    setSaving(true);
    try {
      const id = Math.random().toString(36).substring(2, 9);
      const updated = [...connectors, { ...newConnector, id }];
      await saveSettings({ connectors: updated });
      setView("list");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  if (!bootstrapped) return null;

  return (
    <Card className="p-0 overflow-hidden border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-6 sm:p-8 pb-4">
        <div>
          <h2
            className="font-display text-xl font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 24' }}
          >
            Connectors
          </h2>
          <p className="mt-1 text-sm text-muted">
            You can search for an MCP online, or add one from the library (eg. Gmail) using the “+” button.
          </p>
        </div>
        {view === "list" ? (
          <button
            onClick={() => setView("add-choice")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg hover:bg-accent/90 transition-all active:scale-95"
            aria-label="Add Connector"
          >
            <PlusIcon />
          </button>
        ) : (
          <button
            onClick={() => setView("list")}
            className="text-xs font-medium text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="px-6 sm:px-8 pb-8">
        {view === "list" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Native Tools */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted/60">Built-in Skills</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {internalConnectors.map((c) => {
                  const info = INTERNAL_LABELS[c.id];
                  const extra = c.id === "calendar" && c.enabled && calendarStatus !== "granted" ? (
                    <button
                      onClick={async () => {
                        await fetch("/api/open-calendars-privacy", { method: "POST" });
                        checkCalendar();
                      }}
                      className="mt-2 text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                    >
                      ⚠️ Requires Permission
                    </button>
                  ) : null;

                  return (
                    <ConnectorRow
                      key={c.id}
                      icon={info.icon}
                      name={info.name}
                      desc={info.desc}
                      enabled={c.enabled}
                      onToggle={() => toggleInternal(c.id)}
                      isBuiltIn
                    >
                      {extra}
                    </ConnectorRow>
                  );
                })}
              </div>
            </div>

            {/* External Connections */}
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted/60">External Connections</h3>
              {connectors.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-border/60 bg-surface-2/20">
                  <p className="text-sm text-muted italic">No external integrations connected.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {connectors.map((c) => (
                    <ConnectorRow
                      key={c.id}
                      icon={c.icon || "🔌"}
                      name={c.name}
                      desc={c.description || `${c.type} integration`}
                      enabled={c.enabled}
                      onToggle={() => toggleExternal(c.id)}
                      onDelete={() => removeExternal(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "add-choice" && (
          <div className="grid grid-cols-2 gap-4 py-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setView("gmail-wizard")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border border-border bg-surface hover:border-accent/40 hover:bg-accent-soft/10 transition-all group"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                <span className="text-4xl">✉️</span>
              </div>
              <div className="text-center">
                <span className="block font-medium text-text">Gmail</span>
                <span className="text-xs text-muted">Easy Setup Wizard</span>
              </div>
            </button>
            <button
              onClick={() => setView("custom")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border border-border bg-surface hover:border-accent/40 hover:bg-accent-soft/10 transition-all group"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-muted group-hover:scale-110 transition-transform">
                <TerminalIcon />
              </div>
              <div className="text-center">
                <span className="block font-medium text-text">Custom</span>
                <span className="text-xs text-muted">Any MCP Server</span>
              </div>
            </button>
          </div>
        )}

        {view === "gmail-wizard" && (
          <GmailWizard
            onCancel={() => setView("add-choice")}
            onComplete={(c) => addConnector(c)}
            disabled={saving}
          />
        )}

        {view === "custom" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AddConnectorForm
              onCancel={() => setView("list")}
              onAdd={addConnector}
              disabled={saving}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function GmailWizard({
  onCancel,
  onComplete,
  disabled,
}: {
  onCancel: () => void;
  onComplete: (c: Omit<McpConnector, "id">) => void;
  disabled: boolean;
}) {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const content = await file.text();
      // Basic validation
      if (!content.includes("client_id") || !content.includes("client_secret")) {
        throw new Error("Invalid credentials.json file. Please download the 'Desktop Application' credentials from Google Cloud Console.");
      }

      const res = await fetch("/api/save-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "gmail-credentials.json", content }),
      });

      if (!res.ok) throw new Error("Failed to save credentials file.");

      const { path } = await res.json();

      // Complete setup
      onComplete({
        name: "Gmail",
        enabled: true,
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-google-workspace"],
        env: {
          GOOGLE_CREDENTIALS_PATH: path,
        },
        icon: "✉️",
        description: "Your personalized Google Workspace connector.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white text-2xl shadow-lg">
          ✉️
        </div>
        <div>
          <h3 className="font-display text-lg font-medium text-text">Gmail Setup Wizard</h3>
          <p className="text-xs text-muted">Connect Jarvix to your Gmail in 3 simple steps.</p>
        </div>
      </div>

      <div className="relative h-1 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-accent transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-surface-2/50 border border-border/50">
            <h4 className="text-sm font-semibold text-text mb-2">1. Enable the API</h4>
            <p className="text-xs text-muted leading-relaxed">
              First, you need to create a project in the Google Cloud Console and enable the Gmail API.
              Don't worry, it's free and takes about 2 minutes.
            </p>
            <a
              href="https://console.cloud.google.com/flows/enableapi?apiid=gmail.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center text-xs font-bold text-accent hover:underline"
            >
              Open Google Cloud Console ↗
            </a>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">Continue to Step 2</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-surface-2/50 border border-border/50">
            <h4 className="text-sm font-semibold text-text mb-2">2. Get your Credentials</h4>
            <p className="text-xs text-muted leading-relaxed">
              Go to the <b>Credentials</b> tab, click <b>+ Create Credentials</b>, and choose <b>OAuth client ID</b>.
              Select <b>Desktop App</b> as the type. Download the JSON file when prompted.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={() => setStep(3)} className="flex-[2]">I have the JSON file</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer ${error ? "border-red-400 bg-red-400/5" : "border-border hover:border-accent/40 hover:bg-surface-2"
              }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            {uploading ? (
              <span className="text-sm font-medium animate-pulse">Uploading...</span>
            ) : (
              <>
                <span className="text-3xl mb-3">📄</span>
                <span className="text-sm font-medium text-text">Drop credentials.json here</span>
                <span className="text-xs text-muted mt-1">or click to browse</span>
              </>
            )}
          </div>
          {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}
          <Button variant="secondary" onClick={() => setStep(2)} className="w-full">Back</Button>
        </div>
      )}
    </div>
  );
}

function ConnectorRow({
  icon,
  name,
  desc,
  enabled,
  onToggle,
  onDelete,
  isBuiltIn,
  children,
}: {
  icon: string;
  name: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  isBuiltIn?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-surface-2/40 hover:bg-surface-2/60 transition-all group">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl shadow-sm border border-border/50">
        {icon}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-text truncate">{name}</span>
          <div className="flex items-center gap-2">
            {!isBuiltIn && onDelete && (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-400 transition-all"
                title="Delete"
              >
                <TrashIcon />
              </button>
            )}
            <button
              onClick={onToggle}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? "bg-accent" : "bg-muted/30"
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-4" : "translate-x-0"
                  }`}
              />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-relaxed">{desc}</p>
        {children}
      </div>
    </div>
  );
}

function AddConnectorForm({
  onCancel,
  onAdd,
  disabled,
}: {
  onCancel: () => void;
  onAdd: (c: Omit<McpConnector, "id">) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"stdio" | "sse">("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envVal, setEnvVal] = useState("");
  const [env, setEnv] = useState<Record<string, string>>({});

  const addEnv = () => {
    if (!envKey.trim() || !envVal.trim()) return;
    setEnv((prev) => ({ ...prev, [envKey.trim()]: envVal.trim() }));
    setEnvKey("");
    setEnvVal("");
  };

  const removeEnv = (key: string) => {
    const next = { ...env };
    delete next[key];
    setEnv(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      enabled: true,
      type,
      command: type === "stdio" ? command.trim() : undefined,
      args: type === "stdio" ? args.split(" ").filter((a) => a.trim()) : undefined,
      url: type === "sse" ? url.trim() : undefined,
      env: Object.keys(env).length > 0 ? env : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted px-1">Name</label>
          <Input
            placeholder="e.g. Custom API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted px-1">Type</label>
          <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-surface px-1">
            <button
              type="button"
              onClick={() => setType("stdio")}
              className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all ${type === "stdio" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-text"
                }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => setType("sse")}
              className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all ${type === "sse" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-text"
                }`}
            >
              Remote
            </button>
          </div>
        </div>
      </div>

      {type === "stdio" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted px-1">Command</label>
            <Input
              placeholder="e.g. npx"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted px-1">Arguments</label>
            <Input
              placeholder='e.g. -y @package/server'
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
          </div>
          <div className="space-y-3 pt-2">
            <label className="text-xs font-medium text-muted px-1">Environment Variables</label>
            <div className="flex gap-2">
              <Input
                placeholder="KEY"
                className="font-mono text-[10px]"
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value)}
              />
              <Input
                placeholder="VALUE"
                type="password"
                className="font-mono text-[10px]"
                value={envVal}
                onChange={(e) => setEnvVal(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addEnv} className="shrink-0 px-4">
                Add
              </Button>
            </div>
            {Object.entries(env).length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border bg-surface-2/30">
                {Object.entries(env).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 bg-surface border border-border px-2 py-1 rounded-lg text-[10px] font-mono">
                    <span className="text-muted">{k}=</span>
                    <span className="text-text">****</span>
                    <button type="button" onClick={() => removeEnv(k)} className="text-muted">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted px-1">URL</label>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-muted hover:text-text px-3 py-2 transition-colors"
          disabled={disabled}
        >
          Cancel
        </button>
        <Button type="submit" disabled={disabled || !name.trim()}>
          {disabled ? "Adding…" : "Add Connector"}
        </Button>
      </div>
    </form>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 11 2-2-2-2M11 13h4M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
    </svg>
  );
}
