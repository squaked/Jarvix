/** Client-only: dashboard weather widget caches Open-Meteo responses in localStorage. */

export const WEATHER_WIDGET_CACHE_TTL_MS = 20 * 60 * 1000;

const STORAGE_KEY = "jarvix_weather_widget_cache_v1";

export type WeatherWidgetPayload = {
  temp_c: number;
  feels_like_c: number;
  description: string;
  code: number;
};

type Stored = {
  v: 1;
  locationKey: string;
  fetchedAt: number;
  place: string;
  data: WeatherWidgetPayload;
};

export function weatherWidgetLocationKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function readWeatherWidgetCache(
  locationKey: string,
): { place: string; data: WeatherWidgetPayload } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== 1 || s.locationKey !== locationKey) return null;
    if (Date.now() - s.fetchedAt > WEATHER_WIDGET_CACHE_TTL_MS) return null;
    return { place: s.place, data: s.data };
  } catch {
    return null;
  }
}

export function writeWeatherWidgetCache(
  locationKey: string,
  place: string,
  data: WeatherWidgetPayload,
) {
  if (typeof window === "undefined") return;
  const s: Stored = {
    v: 1,
    locationKey,
    fetchedAt: Date.now(),
    place,
    data,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}
