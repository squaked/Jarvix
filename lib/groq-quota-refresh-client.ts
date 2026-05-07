import type { Settings } from "./types";
import type { GroqTranscriptionUsage } from "./transcribe-api-types";

export async function fetchGroqQuotaRefresh(
  settings: Settings,
): Promise<GroqTranscriptionUsage | null> {
  const res = await fetch("/api/groq-quota-refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  const data = (await res.json()) as {
    usage?: GroqTranscriptionUsage | null;
    error?: string;
  };
  if (!res.ok) return null;
  return data.usage ?? null;
}
