"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PROVIDER_LABEL } from "@/lib/provider-options";
import { useJarvixSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";
import { verifyProviderKey } from "@/lib/verify-provider-key";
import { useEffect, useState } from "react";

const provider = "groq" as const;

function flushGroqIntoProfiles(
  base: Settings["profiles"],
  apiKey: string,
): Settings["profiles"] {
  return {
    ...base,
    groq: { ...base.groq, apiKey },
  };
}

type Props = { onSaved: () => void };

export function ProviderForm({ onSaved }: Props) {
  const { settings, bootstrapped, saveSettings } = useJarvixSettings();
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!bootstrapped) return;
    const pr = settings.profiles.groq;
    setApiKey(pr.apiKey);
  }, [bootstrapped, settings]);

  const persistCurrentFields = async () => {
    if (!bootstrapped) return;
    try {
      const nextProfiles = flushGroqIntoProfiles(settings.profiles, apiKey);
      await saveSettings({ profiles: nextProfiles });
      onSaved();
    } catch { /* noop */ }
  };

  const verifyAndSave = async () => {
    if (!bootstrapped) return;
    setTesting(true);
    setTestMsg(null);
    try {
      const check = await verifyProviderKey({ provider, apiKey });
      if (!check.ok) {
        setTestMsg({ kind: "err", text: check.error });
        return;
      }
      try {
        const nextProfiles = flushGroqIntoProfiles(settings.profiles, apiKey);
        await saveSettings({ profiles: nextProfiles });
        onSaved();
        setTestMsg({ kind: "ok", text: "Connected successfully" });
      } catch {
        setTestMsg({ kind: "err", text: "Key worked, but saving failed. Try again." });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="space-y-7 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          {PROVIDER_LABEL[provider]}
        </h2>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="api-key" className="block text-sm font-medium text-text">
            Your API key
          </label>
          <div className="relative">
            <Input
              id="api-key"
              type={visible ? "text" : "password"}
              value={apiKey}
              placeholder="Paste your secret key here"
              autoComplete="off"
              className="pr-16 text-base"
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={() => void persistCurrentFields()}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            disabled={!apiKey.trim() || testing}
            onClick={() => void verifyAndSave()}
            className="sm:min-w-[180px]"
          >
            {testing ? "Checking…" : "Check key and save"}
          </Button>
        </div>

        {testMsg ? (
          <p
            role="status"
            className="text-sm"
            style={{ color: testMsg.kind === "ok" ? "var(--accent)" : "rgb(239 68 68)" }}
          >
            {testMsg.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
