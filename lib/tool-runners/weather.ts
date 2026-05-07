export type WeatherResult = {
  temp_c: number;
  feels_like_c: number;
  description: string;
  city: string;
};

const codes: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

export async function getWeather(cityInput: string): Promise<WeatherResult> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=1`,
  );
  if (!geoRes.ok) throw new Error("Geocoding request failed.");
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
    throw new Error(`City not found: ${cityInput}`);
  }
  const city = hit.name ?? cityInput;

  const wx = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,apparent_temperature,weather_code`,
  );
  if (!wx.ok) throw new Error("Weather request failed.");
  const wjson = (await wx.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      weather_code?: number;
    };
  };

  const c = wjson.current;
  if (
    !c ||
    c.temperature_2m === undefined ||
    c.temperature_2m === null ||
    Number.isNaN(c.temperature_2m)
  ) {
    throw new Error("No weather data.");
  }

  const code = c.weather_code ?? 0;
  return {
    temp_c: Math.round(c.temperature_2m * 10) / 10,
    feels_like_c: Math.round((c.apparent_temperature ?? c.temperature_2m) * 10) / 10,
    description: codes[code] ?? "Unknown",
    city,
  };
}
