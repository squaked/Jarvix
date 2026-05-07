"use client";

import { MicrophoneIcon } from "@/components/icons/MicrophoneIcon";
import { AgentPersonalizationFields } from "@/components/settings/AgentPersonalizationFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEFAULT_AGENT_PERSONALIZATION } from "@/lib/agent-personalization";
import { PROVIDER_LABEL } from "@/lib/provider-options";
import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import { mergeProfileRecords } from "@/lib/settings-merge";
import { useJarvixSettings } from "@/lib/settings";
import type { AgentPersonalization } from "@/lib/types";
import { verifyProviderKey } from "@/lib/verify-provider-key";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiKeyInput } from "./ApiKeyInput";

const steps = [
  { id: "welcome" },
  { id: "personalize" },
  { id: "weather" },
  { id: "macAccess" },
  { id: "key" },
] as const;

const provider = "groq" as const;

const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

export default function OnboardingFlow() {
  const router = useRouter();
  const { saveSettings, settings, bootstrapped } = useJarvixSettings();
  const [stepIdx, setStepIdx] = useState(0);

  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [agentDraft, setAgentDraft] =
    useState<AgentPersonalization>(DEFAULT_AGENT_PERSONALIZATION);
  const [weatherLocationDraft, setWeatherLocationDraft] = useState(
    DEFAULT_JARVIX_SETTINGS.weatherLocation,
  );
  const [calendarPrivacyOpened, setCalendarPrivacyOpened] = useState(false);
  const [calendarPrivacyBusy, setCalendarPrivacyBusy] = useState(false);
  const [showPrivacyFallbackTip, setShowPrivacyFallbackTip] = useState(false);

  useEffect(() => {
    if (!bootstrapped) return;
    const pr = settings.profiles.groq;
    setApiKey(pr.apiKey);
    setAgentDraft(settings.agent);
    setWeatherLocationDraft(settings.weatherLocation);
  }, [bootstrapped, settings]);

  const connectAndFinish = async () => {
    setKeyError(null);
    setConnecting(true);
    try {
      const check = await verifyProviderKey({ provider, apiKey });
      if (!check.ok) {
        setKeyError(check.error);
        return;
      }
      await saveSettings({
        provider: "groq",
        memoryEnabled: true,
        agent: agentDraft,
        weatherLocation:
          weatherLocationDraft.trim() ||
          DEFAULT_JARVIX_SETTINGS.weatherLocation,
        profiles: mergeProfileRecords(settings.profiles, {
          groq: { apiKey },
        }),
      });
      router.replace("/");
    } finally {
      setConnecting(false);
    }
  };

  const openCalendarPrivacy = async () => {
    setCalendarPrivacyBusy(true);
    try {
      const res = await fetch("/api/open-calendars-privacy", { method: "POST" });
      const data = (await res.json()) as { calendarAccess?: { jarvixHelperReady?: boolean } };
      if (data.calendarAccess?.jarvixHelperReady === false) {
        setShowPrivacyFallbackTip(true);
      }
      setCalendarPrivacyOpened(true);
    } catch {
      setShowPrivacyFallbackTip(true);
      setCalendarPrivacyOpened(true);
    } finally {
      setCalendarPrivacyBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-12 relative overflow-hidden"
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, var(--orb-ring) 0%, transparent 70%)",
        }}
      />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <span
          className="font-display text-2xl font-semibold"
          style={{ color: "var(--accent)", fontVariationSettings: '"opsz" 28' }}
        >
          Jarvix
        </span>
      </motion.div>

      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center mb-12"
      >
        {/* Rings */}
        <div
          className="animate-ring-3 absolute rounded-full"
          style={{ width: 220, height: 220, background: "radial-gradient(circle, var(--orb-ring) 0%, transparent 70%)" }}
        />
        <div
          className="animate-ring-2 absolute rounded-full"
          style={{ width: 175, height: 175, background: "radial-gradient(circle, var(--orb-ring) 20%, transparent 80%)" }}
        />
        <div
          className="animate-ring-1 absolute rounded-full"
          style={{ width: 136, height: 136, background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 75%)" }}
        />

        {/* Orb core */}
        <div
          className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 38% 35%, var(--orb-inner) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface)) 100%)",
            boxShadow: "0 0 40px var(--accent-glow), 0 0 2px var(--border), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
          }}
        >
          <div className="animate-orb-breathe absolute inset-3 rounded-full" style={{ background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <MicrophoneIcon size={24} />
          </div>
        </div>
      </motion.div>

      {/* Step dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 mb-8"
      >
        {steps.map((s, i) => (
          <div
            key={s.id}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === stepIdx ? 24 : 6,
              background: i <= stepIdx ? "var(--accent)" : "var(--border)",
            }}
          />
        ))}
      </motion.div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-surface overflow-hidden"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {/* Step 0: Welcome */}
          {stepIdx === 0 ? (
            <motion.div key="welcome" {...slide} className="flex flex-col gap-6 p-8">
              <div className="text-center">
                <h1
                  className="font-display text-3xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 36' }}
                >
                  Meet Jarvix
                </h1>
                <p className="mt-3 text-base text-muted leading-relaxed">
                  Your personal assistant on Mac—chat in the <strong className="font-medium text-text">browser</strong>
                  , with your stuff kept on this computer. Checks your calendar, the web, and more, just by
                  asking.
                </p>
              </div>
              <Button type="button" className="w-full py-3 text-base" onClick={() => setStepIdx(1)}>
                Let&apos;s get started
              </Button>
            </motion.div>
          ) : null}

          {/* Step 1: Personalize */}
          {stepIdx === 1 ? (
            <motion.div key="personalize" {...slide} className="flex flex-col gap-6 p-8">
              <button
                type="button"
                className="self-start text-sm text-muted hover:text-text transition-colors"
                onClick={() => setStepIdx(0)}
              >
                ← Back
              </button>
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  What should Jarvix call you?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Optional. You can change this later in Settings.
                </p>
              </div>
              <AgentPersonalizationFields value={agentDraft} onChange={setAgentDraft} />
              <div className="flex flex-col gap-2">
                <Button type="button" className="w-full" onClick={() => setStepIdx(2)}>
                  Continue
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted" onClick={() => setStepIdx(2)}>
                  Skip for now
                </Button>
              </div>
            </motion.div>
          ) : null}

          {/* Step 2: Weather location */}
          {stepIdx === 2 ? (
            <motion.div key="weather" {...slide} className="flex flex-col gap-6 p-8">
              <button
                type="button"
                className="self-start text-sm text-muted hover:text-text transition-colors"
                onClick={() => setStepIdx(1)}
              >
                ← Back
              </button>
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Where&apos;s home for weather?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  City or place for your dashboard widget and for &ldquo;local&rdquo; weather in chat. You can change this in Settings anytime.
                </p>
              </div>
              <div>
                <label htmlFor="onboarding-weather" className="sr-only">
                  Weather location
                </label>
                <Input
                  id="onboarding-weather"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Paris"
                  value={weatherLocationDraft}
                  onChange={(e) => setWeatherLocationDraft(e.target.value)}
                />
              </div>
              <Button type="button" className="w-full" onClick={() => setStepIdx(3)}>
                Continue
              </Button>
            </motion.div>
          ) : null}

          {/* Step 3: Calendar (macOS privacy) */}
          {stepIdx === 3 ? (
            <motion.div key="macAccess" {...slide} className="flex flex-col gap-6 p-8">
              <button
                type="button"
                className="self-start text-sm text-muted hover:text-text transition-colors"
                onClick={() => setStepIdx(2)}
              >
                ← Back
              </button>
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Calendar
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  Tap below to open Calendar privacy in System Settings to authorize the app Jarvix is running on this Mac.
                  You can finish later in Settings too.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={calendarPrivacyBusy}
                  onClick={() => void openCalendarPrivacy()}
                >
                  {calendarPrivacyBusy ? "Preparing…" : "Open Calendar privacy"}
                </Button>
                {calendarPrivacyOpened ? (
                  <p className="text-xs" style={{ color: "var(--accent)" }}>
                    Calendar settings should have opened. Turn Calendars on for Jarvix if you see it, then reload this
                    page.
                  </p>
                ) : null}
                {showPrivacyFallbackTip ? (
                  <p className="text-xs text-muted leading-relaxed">
                    Don’t worry if you don’t see “Jarvix” yet—that’s common with a browser setup. Use Cursor, Terminal,
                    or Node in the same list if that’s what runs Jarvix on your Mac, or wait a minute and tap again.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" className="w-full" onClick={() => setStepIdx(4)}>
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted"
                  onClick={() => setStepIdx(4)}
                >
                  Skip for now
                </Button>
              </div>
            </motion.div>
          ) : null}

          {/* Step 4: API key (Groq) */}
          {stepIdx === 4 ? (
            <motion.div key="key" {...slide} className="flex flex-col gap-6 p-8">
              <button
                type="button"
                className="self-start text-sm text-muted hover:text-text transition-colors"
                onClick={() => setStepIdx(3)}
              >
                ← Back
              </button>
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Add your {PROVIDER_LABEL[provider]} key
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Groq provides a free tier for accessing AI.
                </p>
              </div>
              <ApiKeyInput
                provider={provider}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                errorMessage={keyError}
                onUserEdit={() => setKeyError(null)}
              />
              {keyError ? (
                <p className="text-sm text-red-400">{keyError}</p>
              ) : null}
              <Button
                type="button"
                className="w-full py-3 text-base"
                disabled={!apiKey.trim() || connecting}
                onClick={() => void connectAndFinish()}
              >
                {connecting ? "Connecting…" : "Open Jarvix"}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
