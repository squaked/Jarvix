"use client";

import { AgentPersonalizationFields } from "@/components/settings/AgentPersonalizationFields";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_AGENT_PERSONALIZATION } from "@/lib/agent-personalization";
import { useJarvixSettings } from "@/lib/settings";
import type { AgentPersonalization } from "@/lib/types";
import { useEffect, useState } from "react";

type Props = { onSaved: () => void };

export function AgentPersonalizationCard({ onSaved }: Props) {
  const { settings, bootstrapped, saveSettings } = useJarvixSettings();
  const [draft, setDraft] =
    useState<AgentPersonalization>(DEFAULT_AGENT_PERSONALIZATION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bootstrapped) return;
    setDraft(settings.agent);
  }, [bootstrapped, settings.agent]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ agent: draft });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    draft.displayName !== settings.agent.displayName ||
    draft.voicePreset !== settings.agent.voicePreset ||
    draft.voiceCustom !== settings.agent.voiceCustom;

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Your name &amp; Jarvix&apos;s style
        </h2>
      </div>

      <AgentPersonalizationFields value={draft} onChange={setDraft} />

      <div className="flex justify-end border-t border-border pt-6">
        <Button
          type="button"
          disabled={!bootstrapped || !dirty || saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}
