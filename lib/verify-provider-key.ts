import type { Provider } from "@/lib/types";

export type VerifyProviderKeyResult =
  | { ok: true }
  | { ok: false; error: string };

/** Checks credentials against `/api/test-key` (client-side). */
export async function verifyProviderKey(input: {
  provider: Provider;
  apiKey: string;
}): Promise<VerifyProviderKeyResult> {
  try {
    const res = await fetch("/api/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      return {
        ok: false,
        error:
          data.error ??
          "That key didn’t work. Copy it again from your provider’s site and try once more.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Couldn’t reach Jarvix. Check your internet connection and try again.",
    };
  }
}
