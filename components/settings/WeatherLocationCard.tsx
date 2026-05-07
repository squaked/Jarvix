"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import { useJarvixSettings } from "@/lib/settings";
import { useEffect, useState } from "react";

type Props = { onSaved: () => void };

export function WeatherLocationCard({ onSaved }: Props) {
  const { settings, bootstrapped, saveSettings } = useJarvixSettings();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bootstrapped) return;
    setDraft(settings.weatherLocation);
  }, [bootstrapped, settings.weatherLocation]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({
        weatherLocation: draft.trim() || DEFAULT_JARVIX_SETTINGS.weatherLocation,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const dirty = draft.trim() !== settings.weatherLocation.trim();

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div>
        <h2
          className="font-display text-lg font-medium text-text"
          style={{ fontVariationSettings: '"opsz" 20' }}
        >
          Weather location
        </h2>
      </div>

      <div>
        <label htmlFor="weather-location" className="sr-only">
          Location
        </label>
        <Input
          id="weather-location"
          type="text"
          autoComplete="off"
          placeholder="e.g. Paris"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>

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
