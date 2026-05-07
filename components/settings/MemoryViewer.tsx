"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { clearAllMemoryRemote, deleteMemoryRemote, fetchMemories } from "@/lib/memory-client";
import { useJarvixSettings } from "@/lib/settings";
import type { MemoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function Switch({
  pressed,
  onPressedChange,
  id,
  label,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={pressed}
      onClick={() => onPressedChange(!pressed)}
      className="relative h-7 w-12 rounded-full border border-border transition-colors"
      style={pressed ? { background: "var(--accent)", borderColor: "var(--accent)" } : { background: "var(--surface-2)" }}
    >
      <span className="sr-only">{label}</span>
      <motion.span
        layout
        className="absolute top-0.5 h-6 w-6 rounded-full bg-white"
        style={{ left: pressed ? 20 : 2, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

type Props = { onSaved: () => void };

export function MemoryViewer({ onSaved }: Props) {
  const { settings, bootstrapped, saveSettings } = useJarvixSettings();
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const memories = await fetchMemories();
      setItems(memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!bootstrapped) return;
    setEnabled(settings.memoryEnabled);
  }, [bootstrapped, settings.memoryEnabled]);

  useEffect(() => {
    if (!enabled) { setItems([]); setLoading(false); setError(null); return; }
    void reload();
  }, [enabled]);

  const toggleMemory = async (v: boolean) => {
    setEnabled(v);
    await saveSettings({ memoryEnabled: v });
    onSaved();
  };

  const removeRow = async (id: string) => {
    try {
      await deleteMemoryRemote(id);
      onSaved();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete");
    }
  };

  const clearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    try {
      await clearAllMemoryRemote();
      onSaved();
      setConfirmClear(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't clear");
    }
  };

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-lg font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 20' }}
          >
            What Jarvix remembers
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Things you&apos;ve shared that help Jarvix personalise responses.
          </p>
        </div>
        <Switch
          id="memory-toggle"
          label="Memory enabled"
          pressed={enabled}
          onPressedChange={toggleMemory}
        />
      </header>

      {!enabled ? (
        <p className="text-sm text-muted">Memory is off — Jarvix won&apos;t save anything new.</p>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="shimmer h-12 rounded-xl" />)}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted">
          Nothing saved yet. Start chatting and Jarvix will remember useful things.
        </div>
      ) : (
        <ul className="scrollbar-thin flex max-h-72 flex-col gap-2 overflow-y-auto">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3"
            >
              <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-text">
                {m.fact}
              </p>
              <button
                type="button"
                aria-label="Remove"
                className="text-muted hover:text-red-400 transition-colors text-sm px-1"
                onClick={() => void removeRow(m.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {enabled && !loading && items.length > 0 ? (
        <Button
          type="button"
          variant="danger"
          className={cn(!confirmClear ? "opacity-80" : undefined)}
          onClick={() => void clearAll()}
        >
          {confirmClear ? "Tap again to confirm" : "Clear all memories"}
        </Button>
      ) : null}
    </Card>
  );
}
