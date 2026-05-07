"use client";

import { DEFAULT_JARVIX_SETTINGS } from "@/lib/settings-defaults";
import { useJarvixSettings } from "@/lib/settings";
import {
  readWeatherWidgetCache,
  weatherWidgetLocationKey,
  writeWeatherWidgetCache,
  type WeatherWidgetPayload,
} from "@/lib/weather-widget-cache";
import { useEffect, useState } from "react";

type WeatherData = WeatherWidgetPayload & { place?: string };

type State =
  | { status: "loading" }
  | { status: "done"; data: WeatherData }
  | { status: "not-found" }
  | { status: "unavailable" }
  | { status: "error" };

function weatherIcon(code: number): string {
  if (code === 0) return "☀";
  if (code <= 2) return "🌤";
  if (code === 3) return "☁";
  if (code <= 48) return "🌫";
  if (code <= 57) return "🌦";
  if (code <= 67) return "🌧";
  if (code <= 77) return "🌨";
  if (code <= 82) return "🌦";
  return "⛈";
}

function tempLabel(c: number): string {
  return `${Math.round(c)}°`;
}

export function WeatherWidget() {
  const { settings, bootstrapped } = useJarvixSettings();
  const [state, setState] = useState<State>({ status: "loading" });
  const location =
    settings.weatherLocation.trim() || DEFAULT_JARVIX_SETTINGS.weatherLocation;

  useEffect(() => {
    if (!bootstrapped) return;

    const key = weatherWidgetLocationKey(location);
    const cached = readWeatherWidgetCache(key);
    if (cached) {
      setState({
        status: "done",
        data: { ...cached.data, place: cached.place },
      });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(
          `/api/widgets/weather?city=${encodeURIComponent(location)}`,
        );
        if (res.status === 404) {
          if (!cancelled) setState({ status: "not-found" });
          return;
        }
        if (res.status === 502) {
          if (!cancelled) setState({ status: "unavailable" });
          return;
        }
        if (!res.ok) throw new Error("Failed");
        const json = (await res.json()) as WeatherData;
        const { place, ...rest } = json;
        const placeLabel =
          typeof place === "string" && place.trim()
            ? place.trim()
            : location;
        writeWeatherWidgetCache(key, placeLabel, rest);
        if (!cancelled) {
          setState({ status: "done", data: { ...rest, place: placeLabel } });
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, location]);

  return (
    <div className="widget-card animate-fade-up stagger-6">
      <div className="flex items-center gap-2 mb-4">
        <WeatherIcon />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Weather
        </span>
      </div>

      {state.status === "loading" && (
        <div className="shimmer h-14 rounded-xl" />
      )}

      {state.status === "not-found" && (
        <p className="text-sm text-muted py-2">
          No match for &ldquo;{location}&rdquo;. Try another spelling in Settings.
        </p>
      )}

      {state.status === "unavailable" && (
        <p className="text-sm text-muted py-2">
          Weather lookup is temporarily unavailable. Try again shortly.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-sm text-muted py-2">Couldn&apos;t load weather.</p>
      )}

      {state.status === "done" && (
        <div className="flex items-end gap-4">
          <span className="text-4xl leading-none" aria-hidden>
            {weatherIcon(state.data.code)}
          </span>
          <div>
            <p
              className="font-display text-3xl font-medium text-text leading-none"
              style={{ fontVariationSettings: '"opsz" 36' }}
            >
              {tempLabel(state.data.temp_c)}
            </p>
            <p className="text-sm text-muted mt-1">{state.data.description}</p>
            {state.data.place ? (
              <p className="text-xs text-muted mt-0.5">{state.data.place}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
