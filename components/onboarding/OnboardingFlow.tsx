"use client";

import { MicrophoneIcon } from "@/components/icons/MicrophoneIcon";
import { AgentPersonalizationFields } from "@/components/settings/AgentPersonalizationFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEFAULT_AGENT_PERSONALIZATION } from "@/lib/agent-personalization";
import { PROVIDER_LABEL, PROVIDER_KEY_URL } from "@/lib/provider-options";
import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import { mergeProfileRecords } from "@/lib/settings-merge";
import { useJarvixSettings } from "@/lib/settings";
import type { AgentPersonalization } from "@/lib/types";
import { verifyProviderKey } from "@/lib/verify-provider-key";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiKeyInput } from "./ApiKeyInput";

const STEPS = [
  { id: "welcome",   label: "Welcome" },
  { id: "name",      label: "About you" },
  { id: "voice",     label: "Voice" },
  { id: "weather",   label: "Weather" },
  { id: "calendar",  label: "Calendar" },
  { id: "key",       label: "Connect" },
] as const;

type StepId = (typeof STEPS)[number]["id"];
const STEP_COUNT = STEPS.length;

const provider = "groq" as const;

const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const;

type CalendarStatus =
  | { state: "unknown" }
  | { state: "checking" }
  | { state: "granted" }
  | { state: "pending"; status: string }
  | { state: "denied"; status: string };

export default function OnboardingFlow() {
  const router = useRouter();
  const { saveSettings, settings, bootstrapped } = useJarvixSettings();
  const [stepIdx, setStepIdx] = useState(0);

  const [apiKey, setApiKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [agentDraft, setAgentDraft] = useState<AgentPersonalization>(
    DEFAULT_AGENT_PERSONALIZATION,
  );
  const [weatherLocationDraft, setWeatherLocationDraft] = useState(
    DEFAULT_JARVIX_SETTINGS.weatherLocation,
  );

  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    state: "unknown",
  });

  useEffect(() => {
    if (!bootstrapped) return;
    const pr = settings.profiles.groq;
    setApiKey(pr.apiKey);
    setAgentDraft(settings.agent);
    setWeatherLocationDraft(settings.weatherLocation);
  }, [bootstrapped, settings]);

  // ── Calendar live status ────────────────────────────────────────────────
  // Polls /api/calendar-access while the user is on the calendar step so
  // the badge flips to "Granted" the moment they tap Allow in System Settings.
  useEffect(() => {
    const onCalendarStep = STEPS[stepIdx]?.id === "calendar";
    if (!onCalendarStep) return;

    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/calendar-access", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { granted?: boolean; status?: string };
        if (cancelled) return;
        if (data.granted) {
          setCalendarStatus({ state: "granted" });
        } else if (calendarBusy) {
          setCalendarStatus({
            state: "pending",
            status: data.status || "not granted",
          });
        }
      } catch {
        /* offline; try again next tick */
      }
    };
    void check();
    const id = window.setInterval(check, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [stepIdx, calendarBusy]);

  const openCalendarPrivacy = async () => {
    setCalendarBusy(true);
    setCalendarStatus({ state: "checking" });
    try {
      const res = await fetch("/api/open-calendars-privacy", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        calendarAccess?: { accessGranted?: boolean; status?: string };
      };
      const status = data.calendarAccess?.status || "pending";
      if (data.calendarAccess?.accessGranted) {
        setCalendarStatus({ state: "granted" });
      } else {
        setCalendarStatus({ state: "pending", status });
      }
    } catch {
      setCalendarStatus({ state: "denied", status: "request failed" });
    } finally {
      setCalendarBusy(false);
    }
  };

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

  const goNext = () => setStepIdx((i) => Math.min(i + 1, STEP_COUNT - 1));
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));
  const stepId: StepId = STEPS[stepIdx]?.id ?? "welcome";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, var(--orb-ring) 0%, transparent 70%)",
        }}
      />

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

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center mb-10"
      >
        <div className="animate-ring-3 absolute rounded-full" style={{ width: 220, height: 220, background: "radial-gradient(circle, var(--orb-ring) 0%, transparent 70%)" }} />
        <div className="animate-ring-2 absolute rounded-full" style={{ width: 175, height: 175, background: "radial-gradient(circle, var(--orb-ring) 20%, transparent 80%)" }} />
        <div className="animate-ring-1 absolute rounded-full" style={{ width: 136, height: 136, background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 75%)" }} />
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

      {/* Progress dots + label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-2 mb-6"
      >
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === stepIdx ? 24 : 6,
                background: i <= stepIdx ? "var(--accent)" : "var(--border)",
              }}
            />
          ))}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Step {stepIdx + 1} of {STEP_COUNT} · {STEPS[stepIdx]?.label}
        </p>
      </motion.div>

      <div
        className="w-full max-w-md rounded-3xl border border-border bg-surface overflow-hidden"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {stepId === "welcome" && (
            <motion.div key="welcome" {...slide} className="flex flex-col gap-6 p-8">
              <div className="text-center">
                <h1
                  className="font-display text-3xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 36' }}
                >
                  Meet Jarvix
                </h1>
                <p className="mt-3 text-base text-muted leading-relaxed">
                  Your personal assistant on Mac. Type or talk — Jarvix can read
                  your <span className="text-text font-medium">calendar</span>,
                  check the <span className="text-text font-medium">weather</span>,
                  and <span className="text-text font-medium">search the web</span>{" "}
                  for you.
                </p>
                <p className="mt-3 text-sm text-muted/85">
                  Setup takes about a minute.
                </p>
              </div>
              <Button type="button" className="w-full py-3 text-base" onClick={goNext}>
                Let&apos;s get started
              </Button>
            </motion.div>
          )}

          {stepId === "name" && (
            <motion.div key="name" {...slide} className="flex flex-col gap-6 p-8">
              <BackLink onBack={goBack} />
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  What should Jarvix call you?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Just a first name or nickname. You can change it later.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="onboarding-name" className="sr-only">
                  Your name
                </label>
                <Input
                  id="onboarding-name"
                  autoComplete="given-name"
                  placeholder="e.g. Alex"
                  value={agentDraft.displayName}
                  onChange={(e) =>
                    setAgentDraft({ ...agentDraft, displayName: e.target.value })
                  }
                  className="text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" className="w-full" onClick={goNext}>
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted"
                  onClick={goNext}
                >
                  Skip
                </Button>
              </div>
            </motion.div>
          )}

          {stepId === "voice" && (
            <motion.div key="voice" {...slide} className="flex flex-col gap-6 p-8">
              <BackLink onBack={goBack} />
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Pick a voice
                </h2>
                <p className="mt-1 text-sm text-muted">
                  How should Jarvix sound when it talks back?
                </p>
              </div>
              <AgentPersonalizationFields
                value={agentDraft}
                onChange={setAgentDraft}
                hideDisplayName
              />
              <Button type="button" className="w-full" onClick={goNext}>
                Continue
              </Button>
            </motion.div>
          )}

          {stepId === "weather" && (
            <motion.div key="weather" {...slide} className="flex flex-col gap-6 p-8">
              <BackLink onBack={goBack} />
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Where do you live?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Used for the weather widget on your dashboard and for &ldquo;local&rdquo;
                  questions like &ldquo;what&rsquo;s the weather like?&rdquo;
                </p>
              </div>
              <div>
                <label htmlFor="onboarding-weather" className="sr-only">
                  Weather location
                </label>
                <Input
                  id="onboarding-weather"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="e.g. Paris"
                  value={weatherLocationDraft}
                  onChange={(e) => setWeatherLocationDraft(e.target.value)}
                  className="text-base"
                />
              </div>
              <Button type="button" className="w-full" onClick={goNext}>
                Continue
              </Button>
            </motion.div>
          )}

          {stepId === "calendar" && (
            <motion.div key="calendar" {...slide} className="flex flex-col gap-6 p-8">
              <BackLink onBack={goBack} />
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Connect your calendar
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  Lets Jarvix answer questions like{" "}
                  <span className="italic">&ldquo;what&rsquo;s on my calendar today?&rdquo;</span>{" "}
                  Everything stays on your Mac.
                </p>
              </div>

              <CalendarStatusBadge status={calendarStatus} />

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={calendarStatus.state === "granted" ? "ghost" : "secondary"}
                  className="w-full"
                  disabled={calendarBusy || calendarStatus.state === "granted"}
                  onClick={() => void openCalendarPrivacy()}
                >
                  {calendarBusy
                    ? "Opening Privacy Settings…"
                    : calendarStatus.state === "granted"
                      ? "✓ Calendar connected"
                      : "Allow Calendar access"}
                </Button>
                {calendarStatus.state === "pending" && (
                  <p className="text-xs text-muted leading-snug">
                    macOS just opened <span className="text-text font-medium">Privacy &amp; Security → Calendars</span>.
                    Toggle <span className="text-text font-medium">Jarvix</span> on
                    (or whichever app is listed for the Jarvix server). This box will turn green automatically.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" className="w-full" onClick={goNext}>
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted"
                  onClick={goNext}
                >
                  Skip for now
                </Button>
              </div>
            </motion.div>
          )}

          {stepId === "key" && (
            <motion.div key="key" {...slide} className="flex flex-col gap-6 p-8">
              <BackLink onBack={goBack} />
              <div>
                <h2
                  className="font-display text-2xl font-medium text-text"
                  style={{ fontVariationSettings: '"opsz" 28' }}
                >
                  Connect Jarvix to {PROVIDER_LABEL[provider]}
                </h2>
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  Jarvix uses {PROVIDER_LABEL[provider]} for its brain. They give
                  you a generous free tier — no credit card needed.
                </p>
              </div>

              <ol className="space-y-2 rounded-2xl border border-border/70 bg-surface-2/50 p-4 text-sm">
                <KeyStep
                  n={1}
                  text={<>Open <a className="font-medium text-accent underline-offset-4 hover:underline" href={PROVIDER_KEY_URL[provider]} target="_blank" rel="noreferrer">console.groq.com/keys</a> and sign up (free).</>}
                />
                <KeyStep
                  n={2}
                  text={<>Click <span className="font-medium text-text">&ldquo;Create API Key&rdquo;</span>, give it any name (e.g. &ldquo;Jarvix&rdquo;).</>}
                />
                <KeyStep
                  n={3}
                  text={<>Copy the long string starting with <code className="rounded bg-surface px-1 text-[12px]">gsk_</code> and paste it below.</>}
                />
              </ol>

              <ApiKeyInput
                provider={provider}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                errorMessage={keyError}
                onUserEdit={() => setKeyError(null)}
              />

              <Button
                type="button"
                className="w-full py-3 text-base"
                disabled={!apiKey.trim() || connecting}
                onClick={() => void connectAndFinish()}
              >
                {connecting ? "Connecting…" : "Open Jarvix"}
              </Button>
              <p className="text-center text-xs text-muted">
                Your key stays on this Mac. It is never sent to anyone except {PROVIDER_LABEL[provider]}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      className="self-start text-sm text-muted hover:text-text transition-colors"
      onClick={onBack}
    >
      ← Back
    </button>
  );
}

function KeyStep({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {n}
      </span>
      <span className="text-text/90 leading-snug">{text}</span>
    </li>
  );
}

function CalendarStatusBadge({ status }: { status: CalendarStatus }) {
  if (status.state === "unknown") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-muted/50" />
        Not connected yet
      </div>
    );
  }
  if (status.state === "checking") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted" />
        Checking permissions…
      </div>
    );
  }
  if (status.state === "granted") {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
          background: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
        Calendar access granted
      </div>
    );
  }
  if (status.state === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        Waiting for you in System Settings…
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-3 py-2 text-xs text-red-500">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Couldn&apos;t request access ({status.status}).
    </div>
  );
}
