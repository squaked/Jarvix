import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { groqUsageFromHeaders, isGroqUsagePayloadEmpty } from "@/lib/groq-usage-from-headers";
import { getLanguageModel } from "@/lib/jarvix-model";
import { hasActiveApiKey } from "@/lib/settings-credentials";
import { mergeSettingsPartial } from "@/lib/settings-merge";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { settings?: Settings };
  try {
    body = (await req.json()) as { settings?: Settings };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = mergeSettingsPartial(body.settings ?? {});
  if (!hasActiveApiKey(settings)) {
    return Response.json({ error: "Missing API key" }, { status: 400 });
  }

  let model;
  try {
    model = getLanguageModel(settings);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Bad configuration" },
      { status: 400 },
    );
  }

  try {
    const result = await generateText({
      model,
      prompt: "Respond with exactly: OK",
      maxOutputTokens: 16,
      temperature: 0,
    });

    const headers = result.response?.headers;
    const usage = groqUsageFromHeaders(headers);
    if (isGroqUsagePayloadEmpty(usage)) {
      return Response.json({ usage: null, error: "No rate-limit metadata in response" }, { status: 200 });
    }
    return Response.json({ usage });
  } catch (e) {
    return Response.json(
      { usage: null, error: e instanceof Error ? e.message : "Groq request failed" },
      { status: 502 },
    );
  }
}
