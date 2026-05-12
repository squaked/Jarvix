#!/bin/bash
# Rebuilds ~/Applications/Jarvix.app using electron-builder.
# Compiles the Electron main process (TypeScript → JS) then packages it into
# a native macOS .app bundle and places it in ~/Applications.
#
# No Apple Developer account is needed. The app is ad-hoc signed with
# `codesign --sign -` which satisfies macOS security for locally-built apps.
# Because the .app is built locally (not downloaded), macOS never attaches
# the com.apple.quarantine attribute and Gatekeeper does not prompt.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="$HOME/Applications/Jarvix.app"

echo "  → Rebuilding Jarvix.app (Electron)..."

cd "$INSTALL_DIR"

# Make sure node/npm/npx are on PATH (important when called from launchd or update.sh)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin:${PATH:-}"

# ── 1. Stop any running Jarvix.app instance ───────────────────────────────────
/usr/bin/pkill -f "Applications/Jarvix.app/Contents/MacOS/Jarvix" 2>/dev/null || true
# Kill old AppleScript applet instances (migration path from pre-Electron builds)
/usr/bin/pkill -f "Applications/Jarvix.app/Contents/MacOS/applet" 2>/dev/null || true
# Kill any launcher.sh tied to this install dir specifically
/usr/bin/pkill -f "${INSTALL_DIR}/scripts/macos/launcher.sh" 2>/dev/null || true
sleep 1

# ── 2. Compile Electron main process (TypeScript → CommonJS) ──────────────────
echo "    Compiling Electron main process..."
npm run electron:compile --silent

# ── 3. Build .app with electron-builder ───────────────────────────────────────
# Build for the current machine's architecture only — keeps first-install fast
# (no universal fat binary needed for a personal-machine install).
ARCH="$(uname -m)"
# electron-builder v25+ does not accept `--arch`; use --arm64 or --x64 booleans.
if [ "$ARCH" = "arm64" ]; then
  EB_ARCH_FLAG=(--arm64)
else
  EB_ARCH_FLAG=(--x64)
fi

echo "    Packaging with electron-builder (${ARCH})..."

# Remove stale output so the .app glob below always picks up this build,
# not a leftover directory from a previous run with a different arch.
rm -rf "$INSTALL_DIR/dist/electron-build"

# CSC_IDENTITY_AUTO_DISCOVERY=false: prevent electron-builder from looking for
# a code-signing certificate. We handle signing ourselves below.
CSC_IDENTITY_AUTO_DISCOVERY=false \
  npx electron-builder --mac dir "${EB_ARCH_FLAG[@]}" 2>&1 | grep -v "^$" | sed 's/^/    /'

# ── 4. Locate built .app and move to ~/Applications ───────────────────────────
BUILT_APP="$(ls -d "$INSTALL_DIR/dist/electron-build"/*/Jarvix.app 2>/dev/null | head -1)"
if [ -z "$BUILT_APP" ]; then
  echo "    ✗ electron-builder output not found under dist/electron-build/" >&2
  exit 1
fi

mkdir -p "$HOME/Applications"
rm -rf "$APP_PATH"
cp -R "$BUILT_APP" "$APP_PATH"

# ── 5. Ad-hoc code sign ───────────────────────────────────────────────────────
# Sign with identity '-' (ad-hoc): no developer certificate required.
# --deep  signs all nested binaries (frameworks, GPU/crashpad helpers, etc.)
# --force overwrites any signature electron-builder may have already applied.
# This makes the binary valid on Apple Silicon and avoids "damaged app" errors.
echo "    Ad-hoc signing..."
/usr/bin/codesign --sign - --deep --force "$APP_PATH" 2>/dev/null || true

# ── 6. Strip quarantine attribute ─────────────────────────────────────────────
# A cp/rsync from a local build path never sets quarantine, but run this as a
# safety net in case Finder or a browser ever touches the bundle.
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true

# ── 7. Register with Launch Services ──────────────────────────────────────────
touch "$APP_PATH"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_PATH" 2>/dev/null || true

# ── 8. Icon cache (Dock/Finder often keep the old .icns until Icon Services refreshes)
rm -rf "$HOME/Library/Caches/com.apple.iconservices.store" 2>/dev/null || true
/usr/bin/killall Dock 2>/dev/null || true

echo "    ✓ Jarvix.app rebuilt — open ~/Applications/Jarvix.app to try it"
