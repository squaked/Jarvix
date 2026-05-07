/** Jarvix local tools expect macOS (EventKit, mdfind, screencapture). */
export function requireDarwin(feature: string): void {
  if (process.platform !== "darwin") {
    throw new Error(`${feature} is only available on macOS.`);
  }
}
