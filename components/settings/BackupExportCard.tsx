"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildJarvixBackupPayload,
  downloadJarvixBackupJson,
  parseJarvixBackupFile,
  restoreJarvixBackupMerge,
} from "@/lib/backup";
import { readSettingsMirror } from "@/lib/client-settings-cache";
import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import { mergeSettingsOnto } from "@/lib/settings-merge";
import { useJarvixSettings } from "@/lib/settings";
import { useCallback, useRef, useState } from "react";

type Props = { onRestored?: () => void };

export function BackupExportCard({ onRestored }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { bootstrapped, saveSettings } = useJarvixSettings();

  const [exportKeys, setExportKeys] = useState(false);
  const [importSettings, setImportSettings] = useState(false);

  const [busy, setBusy] = useState<
    false | "export" | "import"
  >(false);

  const [error, setError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);

  const notify = useCallback(
    (kind: string) => {
      setLastOk(kind);
      window.setTimeout(() => setLastOk(null), 4000);
    },
    [],
  );

  const onExport = async () => {
    setError(null);
    setBusy("export");
    try {
      const payload = await buildJarvixBackupPayload(exportKeys);
      downloadJarvixBackupJson(payload);
      notify("Backup downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !bootstrapped) return;
    setError(null);
    setBusy("import");
    try {
      const text = await f.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const parsed = parseJarvixBackupFile(raw);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }

      await restoreJarvixBackupMerge(parsed.data);

      if (
        importSettings &&
        parsed.data.settings &&
        Object.keys(parsed.data.settings).length > 0
      ) {
        const base =
          readSettingsMirror() ?? DEFAULT_JARVIX_SETTINGS;
        await saveSettings(mergeSettingsOnto(base, parsed.data.settings));
      }

      notify("Restore merged into this browser");
      onRestored?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportDisabled =
    typeof window === "undefined" || Boolean(busy) || !bootstrapped;

  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <header>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Backup &amp; restore
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Save chats and memory as JSON, or merge a backup from another browser.
          Stored data stays in this browser profile unless you also run a syncing
          host.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {lastOk ? (
        <p className="text-sm text-emerald-500/90" role="status">
          {lastOk}
        </p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border bg-surface-2/40 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Export
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-text">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
            checked={exportKeys}
            onChange={(ev) => setExportKeys(ev.target.checked)}
          />
          <span>
            Include settings (Groq keys and personalization). Treat the downloaded
            file as private — anyone with the file can use your credentials.
          </span>
        </label>
        <Button
          variant="secondary"
          disabled={exportDisabled || busy === "export"}
          onClick={() => void onExport()}
        >
          Download backup (.json)
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface-2/40 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Restore
        </p>
        <p className="text-sm text-muted">
          Merges by chat id / memory fact dedupe; does not wipe what you already
          have unless you overwrite in the backup.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-text">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border accent-[var(--accent)]"
            checked={importSettings}
            disabled={!bootstrapped || Boolean(busy)}
            onChange={(ev) => setImportSettings(ev.target.checked)}
          />
          <span>
            When restoring, also merge{' '}
            <code className="text-muted">settings</code> from the backup (if present).
          </span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(ev) => void onFileChange(ev)}
        />
        <Button
          variant="secondary"
          disabled={
            typeof window === "undefined" ||
            Boolean(busy) ||
            !bootstrapped
          }
          onClick={onPickFile}
        >
          {busy === "import" ? "Merging…" : "Restore from backup file…"}
        </Button>
        <p className="text-xs text-muted">
          Tip: pick a file exported from Jarvix with{" "}
          <code className="text-[0.95em]">jarvixBackupVersion: 1</code>.
        </p>
      </div>
    </Card>
  );
}
