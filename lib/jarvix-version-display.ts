/**
 * Human-readable build stamp for Settings / diagnostics.
 * Values come from `next.config.mjs` (`NEXT_PUBLIC_*`).
 */
export function jarvixDisplayVersion(): string {
  const pkg =
    process.env.NEXT_PUBLIC_JARVIX_PKG_VERSION?.trim() || "";
  const revRaw = process.env.NEXT_PUBLIC_JARVIX_GIT_REV?.trim() || "";
  const rev = revRaw === "unknown" ? "" : revRaw;

  const vPart = pkg ? `v${pkg}` : "";
  if (vPart && rev) return `${vPart} · ${rev}`;
  if (vPart) return vPart;
  if (rev) return rev;
  return "";
}
