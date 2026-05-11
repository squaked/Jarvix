"use client";

import { AgentPersonalizationCard } from "@/components/settings/AgentPersonalizationCard";
import { CalendarAccessCard } from "@/components/settings/CalendarAccessCard";
import { WeatherLocationCard } from "@/components/settings/WeatherLocationCard";
import { GroqUsageSection } from "@/components/settings/GroqUsageSection";
import { MemoryViewer } from "@/components/settings/MemoryViewer";
import { ProviderForm } from "@/components/settings/ProviderForm";
import { CheckUpdatesSection } from "@/components/settings/CheckUpdatesSection";
import { ThemeCard } from "@/components/settings/ThemeCard";
import { TtsSettingsCard } from "@/components/settings/TtsSettingsCard";
import { AboutCard } from "@/components/settings/AboutCard";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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

      <div className="mx-auto max-w-2xl px-6 py-10 flex flex-col gap-10">
        <Section title="Personal">
          <AgentPersonalizationCard onSaved={notifySaved} />
          <WeatherLocationCard onSaved={notifySaved} />
          <MemoryViewer onSaved={notifySaved} />
        </Section>

        <Section title="Mac access">
          <CalendarAccessCard />
        </Section>

        <Section title="App">
          <ThemeCard />
        </Section>

        <Section title="AI">
          <ProviderForm onSaved={notifySaved} />
          <TtsSettingsCard onSaved={notifySaved} />
        </Section>

        <Section title="System">
          <GroqUsageSection />
          <CheckUpdatesSection />
        </Section>

        <Section title="About">
          <AboutCard />
        </Section>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
