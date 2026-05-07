/**
 * JSON.stringify replacer that drops huge base64 blobs (tool outputs, screenshots).
 * Keeps NDJSON streams and UI tool cards responsive.
 */
export function jsonSafeReplacer(key: string, value: unknown): unknown {
  if (key === "base64" && typeof value === "string" && value.length > 400) {
    return `[omitted base64, ${value.length} characters]`;
  }
  return value;
}

export function jsonStringifyLine(value: unknown): string {
  return `${JSON.stringify(value, jsonSafeReplacer)}\n`;
}

export function jsonStringifyPretty(value: unknown, space = 2): string {
  return JSON.stringify(value, jsonSafeReplacer, space);
}
