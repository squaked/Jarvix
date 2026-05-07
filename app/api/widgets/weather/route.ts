import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WX_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  61: "Rain",
  63: "Steady rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

/** Avoid Open-Meteo geocoding when it is down or returns empty; also speeds up common defaults. */
const STATIC_PLACE_BY_NORMALIZED: Record<
  string,
  { lat: number; lon: number; place: string }
> = {
  paris: { lat: 48.8566, lon: 2.3522, place: "Paris" },
};

function staticPlaceLookup(raw: string): {
  lat: number;
  lon: number;
  place: string;
} | null {
  const key = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!key) return null;
  return STATIC_PLACE_BY_NORMALIZED[key] ?? null;
}

type GeocodeResult =
  | { kind: "ok"; lat: number; lon: number; place: string }
  | { kind: "not_found" }
  | { kind: "unavailable" };

async function geocodeCity(name: string): Promise<GeocodeResult> {
  const trimmed = name.trim();
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1`,
    { cache: "no-store" },
  );
  if (!geoRes.ok) return { kind: "unavailable" };
  const geo = (await geoRes.json()) as {
    results?: { name?: string; latitude?: number; longitude?: number }[];
  };
  const hit = geo.results?.[0];
  if (
    !hit ||
    hit.latitude === undefined ||
    hit.latitude === null ||
    hit.longitude === undefined ||
    hit.longitude === null ||
    Number.isNaN(hit.latitude) ||
    Number.isNaN(hit.longitude)
  ) {
    return { kind: "not_found" };
  }
  return {
    kind: "ok",
    lat: hit.latitude,
    lon: hit.longitude,
    place: hit.name ?? trimmed,
  };
}

export async function GET(req: NextRequest) {
  const cityRaw = req.nextUrl.searchParams.get("city");
  const city = cityRaw?.trim() ?? "";
  const latQ = req.nextUrl.searchParams.get("lat");
  const lonQ = req.nextUrl.searchParams.get("lon");

  let lat: number;
  let lon: number;
  let place: string | undefined;

  if (city) {
    const preset = staticPlaceLookup(city);
    if (preset) {
      lat = preset.lat;
      lon = preset.lon;
      place = preset.place;
    } else {
      const g = await geocodeCity(city);
      if (g.kind === "unavailable") {
        return NextResponse.json(
          { error: "Geocoding unavailable" },
          { status: 502 },
        );
      }
      if (g.kind === "not_found") {
        return NextResponse.json({ error: "Place not found" }, { status: 404 });
      }
      lat = g.lat;
      lon = g.lon;
      place = g.place;
    }
  } else if (latQ && lonQ) {
    lat = Number(latQ);
    lon = Number(lonQ);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "Missing city or coordinates" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Open-Meteo request failed");

    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
      };
    };

    const c = data.current;
    if (!c || c.temperature_2m === undefined) {
      return NextResponse.json({ error: "No data" }, { status: 502 });
    }

    const code = c.weather_code ?? 0;
    const body: Record<string, unknown> = {
      temp_c: Math.round(c.temperature_2m * 10) / 10,
      feels_like_c:
        Math.round((c.apparent_temperature ?? c.temperature_2m) * 10) / 10,
      description: WX_CODES[code] ?? "Unknown",
      code,
    };
    if (place) body.place = place;

    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
