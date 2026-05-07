"use client";

import {
  clearSettingsMirror,
  readSettingsMirror,
  writeSettingsMirror,
} from "@/lib/client-settings-cache";
import {
  DEFAULT_JARVIX_SETTINGS,
  SETTINGS_LOCALSTORAGE_LEGACY_KEYS,
} from "@/lib/settings-defaults";
import { hasActiveApiKey } from "@/lib/settings-credentials";
import { mergeSettingsOnto, mergeSettingsPartial } from "@/lib/settings-merge";
import type { Settings } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  settings: Settings;
  /** Browser applied local mirror + legacy key (layout effect). */
  bootstrapped: boolean;
  /** Server reconcile finished (`/api/settings`). */
  serverReady: boolean;
  /** Alias for `serverReady` (older call sites). */
  ready: boolean;
  saveSettings: (partial: Partial<Settings>) => Promise<Settings>;
  clearSettingsAll: () => Promise<void>;
};

const JarvixSettingsContext = createContext<Ctx | null>(null);

function hydrateFromLocalStores(): Settings {
  let s = mergeSettingsPartial(readSettingsMirror() ?? {});

  if (typeof window !== "undefined") {
    for (const legacyKey of SETTINGS_LOCALSTORAGE_LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      try {
        if (!hasActiveApiKey(s)) {
          const parsed = JSON.parse(legacyRaw) as Partial<Settings>;
          s = mergeSettingsPartial({
            ...DEFAULT_JARVIX_SETTINGS,
            ...parsed,
          });
        }
      } catch {
        /* noop */
      } finally {
        localStorage.removeItem(legacyKey);
      }
    }
  }

  writeSettingsMirror(s);
  return s;
}

export function JarvixSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_JARVIX_SETTINGS);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const hydratedRef = useRef<Settings>(DEFAULT_JARVIX_SETTINGS);

  useLayoutEffect(() => {
    const local = hydrateFromLocalStores();
    hydratedRef.current = local;
    setSettings(local);
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;

    async function reconcile() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("settings fetch");
        let server = (await res.json()) as Settings;

        if (!hasActiveApiKey(server)) {
          const fallback = hydratedRef.current;
          if (hasActiveApiKey(fallback)) {
            const post = await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fallback),
            });
            if (post.ok) {
              server = (await post.json()) as Settings;
            } else {
              /** Server is empty/unreachable but local mirror has keys — never wipe BYOK. */
              server = fallback;
            }
          }
        }

        if (!cancelled) {
          writeSettingsMirror(server);
          setSettings(server);
          hydratedRef.current = server;
        }
      } catch {
        const fallback = hydratedRef.current;
        if (!cancelled && hasActiveApiKey(fallback)) {
          writeSettingsMirror(fallback);
          setSettings(fallback);
        }
      } finally {
        if (!cancelled) setServerReady(true);
      }
    }

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped]);

  const saveSettings = useCallback(async (partial: Partial<Settings>) => {
    const optimistic = mergeSettingsOnto(hydratedRef.current, partial);
    writeSettingsMirror(optimistic);
    hydratedRef.current = optimistic;
    setSettings(optimistic);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error("Failed to save settings");
    const next = (await res.json()) as Settings;
    writeSettingsMirror(next);
    hydratedRef.current = next;
    setSettings(next);
    return next;
  }, []);

  const clearSettingsAll = useCallback(async () => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    if (!res.ok) throw new Error("Failed to clear settings");
    const next = (await res.json()) as Settings;
    clearSettingsMirror();
    hydratedRef.current = next;
    setSettings(next);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      bootstrapped,
      serverReady,
      ready: serverReady,
      saveSettings,
      clearSettingsAll,
    }),
    [settings, bootstrapped, serverReady, saveSettings, clearSettingsAll],
  );

  return (
    <JarvixSettingsContext.Provider value={value}>
      {children}
    </JarvixSettingsContext.Provider>
  );
}

export function useJarvixSettings() {
  const ctx = useContext(JarvixSettingsContext);
  if (!ctx) {
    throw new Error(
      "useJarvixSettings must be used inside JarvixSettingsProvider",
    );
  }
  return ctx;
}
