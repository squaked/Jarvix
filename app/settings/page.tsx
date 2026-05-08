"use client";

import { AgentPersonalizationCard } from "@/components/settings/AgentPersonalizationCard";
import { CalendarAccessCard } from "@/components/settings/CalendarAccessCard";
import { WeatherLocationCard } from "@/components/settings/WeatherLocationCard";
import { GroqUsageSection } from "@/components/settings/GroqUsageSection";
import { MemoryViewer } from "@/components/settings/MemoryViewer";
import { ProviderForm } from "@/components/settings/ProviderForm";
import { CheckUpdatesSection } from "@/components/settings/CheckUpdatesSection";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function SettingsPage() {
  const [toastVisible, setToastVisible] = useState(false);

  const notifySaved = useCallback(() => {
    setToastVisible(true);
  }, []);

  useEffect(() => {
    if (!toastVisible) return;
    const id = window.setTimeout(() => setToastVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [toastVisible]);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-text hover:border-accent/30 transition-all"
            aria-label="Back to home"
            style={{ boxShadow: "var(--warm-shadow)" }}
          >
            <BackIcon />
          </Link>
          <h1
            className="font-display text-2xl font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 28' }}
          >
            Settings
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10 flex flex-col gap-6">
        <ProviderForm onSaved={notifySaved} />
        <GroqUsageSection />
        <AgentPersonalizationCard onSaved={notifySaved} />
        <WeatherLocationCard onSaved={notifySaved} />
        <CalendarAccessCard />
        <MemoryViewer onSaved={notifySaved} />
        <CheckUpdatesSection />
      </div>

      {/* Saved toast */}
      <AnimatePresence>
        {toastVisible ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2 text-sm font-medium"
            style={{ background: "var(--text)", color: "var(--bg)", boxShadow: "var(--warm-shadow)" }}
          >
            Saved
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
