import type { Provider } from "./types";

/**
 * Return additional stream options for the current provider.
 * Groq uses no extra providerOptions.
 */
export function jarvixChatStreamProviderOptions(_provider: Provider) {
  return undefined;
}
