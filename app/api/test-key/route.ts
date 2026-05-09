import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { getLanguageModel } from "@/lib/jarvix-model";
import { createDefaultProfiles } from "@/lib/settings-defaults";
import { mergeProfileRecords, mergeSettingsPartial } from "@/lib/settings-merge";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

type TestPayload = {
  provider?: unknown;
  apiKey?: string;
};

export async function POST(req: NextRequest) {
  let payload: TestPayload;
  try {
    payload = (await req.json()) as TestPayload;
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = payload.apiKey?.trim();

  if (!apiKey) {
    return Response.json({
      success: false,
      error: "Missing API key",
    });
  }

  const pseudo: Settings = mergeSettingsPartial({
    memoryEnabled: true,
    profiles: mergeProfileRecords(createDefaultProfiles(), {
      groq: {
        apiKey: apiKey ?? "",
        model: "",
      },
    }),
  });

  try {
    const model = getLanguageModel(pseudo);
    await generateText({
      model,
      prompt: "Respond exactly: OK",
      maxOutputTokens: 16,
      temperature: 0,
    });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({
      success: false,
      error: e instanceof Error ? e.message : "Provider rejected the key.",
    });
  }
}
