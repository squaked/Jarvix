#!/bin/bash
set -euo pipefail

# ── Safety Check ──────────────────────────────────────────────────────────────
if [ "$EUID" -eq 0 ]; then
  echo "  ✗ Please do NOT run this script with sudo."
  echo "    Jarvix should be installed as a regular user to manage your apps and files correctly."
  exit 1
fi

# ── Configuration ─────────────────────────────────────────────────────────────
REPO_URL="${JARVIX_REPO_URL:-https://github.com/squaked/Jarvix.git}"
INSTALL_DIR="${JARVIX_INSTALL_DIR:-$HOME/.jarvix-app}"
SERVER_LABEL="com.jarvix.server"
UPDATER_LABEL="com.jarvix.updater"
SERVER_PLIST="$HOME/Library/LaunchAgents/${SERVER_LABEL}.plist"
UPDATER_PLIST="$HOME/Library/LaunchAgents/${UPDATER_LABEL}.plist"
APP_PATH="$HOME/Applications/Jarvix.app"
LOG_DIR="$INSTALL_DIR/logs"

# Support private repos via token: JARVIX_GITHUB_TOKEN=ghp_xxx curl ... | bash
if [ -n "${JARVIX_GITHUB_TOKEN:-}" ]; then
  REPO_URL="https://${JARVIX_GITHUB_TOKEN}@${REPO_URL#https://}"
fi

# ── Helpers ────────────────────────────────────────────────────────────────────
step() { echo ""; echo "  → $1"; }
ok()   { echo "    ✓ $1"; }
fail() { echo ""; echo "  ✗ $1" >&2; exit 1; }

echo ""
echo "  ╔═══════════════════════════╗"
echo "  ║   Jarvix — AI Assistant   ║"
echo "  ╚═══════════════════════════╝"

# ── 1. Homebrew ────────────────────────────────────────────────────────────────
# `curl … | bash` uses a non-login shell; ~/.zprofile is not sourced, so brew
# may be missing from PATH even when installed. Add standard install locations first.
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

if ! command -v brew &>/dev/null; then
  step "Installing Homebrew (this may ask for your password)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Initialize brew for this session (same non-login PATH issue as above).
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  command -v brew &>/dev/null || fail "Homebrew installed but not found in PATH. Please restart your terminal and re-run."
  ok "Homebrew installed"
else
  ok "Homebrew found"
fi

# ── 2. Git / Xcode Tools ──────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  step "Installing Git & Xcode Command Line Tools..."
  echo "    (Please click 'Install' on the macOS popup that just appeared)"
  xcode-select --install 2>/dev/null || true
  # Wait for user to finish installation
  for i in $(seq 1 60); do
    if command -v git &>/dev/null; then break; fi
    sleep 10
  done
  command -v git &>/dev/null || fail "Git is required. Please install Xcode Command Line Tools then re-run this script."
  ok "Git installed"
else
  ok "Git found"
fi

# ── 3. Node.js ─────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  step "Installing Node.js..."
  brew install node
  ok "Node.js installed"
else
  ok "Node.js found"
fi

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$NODE_BIN")"

# ── 4. Clone or update repo ────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  step "Updating Jarvix code..."
  git -C "$INSTALL_DIR" pull --ff-only 2>&1 | sed 's/^/    /'
  ok "Code updated"
else
  step "Downloading Jarvix..."
  git clone "$REPO_URL" "$INSTALL_DIR" 2>&1 | sed 's/^/    /'
  ok "Code downloaded"
fi

# ── 5. Build ───────────────────────────────────────────────────────────────────
step "Installing dependencies and building (about 1 minute)..."
cd "$INSTALL_DIR"
"$NPM_BIN" install --silent
"$NPM_BIN" run build --silent
ok "Web app build complete"

# ── 5.5. Build Native Swift Helper (for Calendar) ─────────────────────────────
step "Building native Calendar helper..."
HELPER_BUILD_SCRIPT="$INSTALL_DIR/scripts/macos/JarvixEventKitHelper/build.sh"
if [ -f "$HELPER_BUILD_SCRIPT" ]; then
  chmod +x "$HELPER_BUILD_SCRIPT"
  /bin/bash "$HELPER_BUILD_SCRIPT" > /dev/null 2>&1 || echo "    (Native helper build skipped, using fallback)"
  ok "Native helper ready"
else
  echo "    (Build script missing, skipping native helper)"
fi

# ── 6. Log directory ───────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── 7. Server LaunchAgent ──────────────────────────────────────────────────────
step "Setting up background service..."
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$SERVER_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVER_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/scripts/start-server.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
    <key>JARVIX_INSTALL_DIR</key>
    <string>${INSTALL_DIR}</string>
  </dict>
  <key>WorkingDirectory</key>
  <string>${INSTALL_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
PLIST

launchctl unload "$SERVER_PLIST" 2>/dev/null || true
launchctl load "$SERVER_PLIST"
ok "Background service installed"

# ── 8. Auto-updater LaunchAgent ───────────────────────────────────────────────
cat > "$UPDATER_PLIST" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${UPDATER_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${INSTALL_DIR}/scripts/update.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
  <key>StartInterval</key>
  <integer>21600</integer>
</dict>
</plist>
PLIST

launchctl unload "$UPDATER_PLIST" 2>/dev/null || true
launchctl load "$UPDATER_PLIST"
ok "Auto-updater installed"

# ── 9. Jarvix.app in ~/Applications ───────────────────────────────────────────
step "Building Jarvix app (Electron — downloads ~130 MB on first run)..."
mkdir -p "$HOME/Applications"

# Delegate the Electron build to scripts/macos/rebuild-app.sh. That script is
# the single source of truth: it compiles the TypeScript main process, runs
# electron-builder --mac dir, ad-hoc signs the bundle, and registers it with
# Launch Services. install.sh just kicks it off.
chmod +x "$INSTALL_DIR/scripts/macos/rebuild-app.sh"
chmod +x "$INSTALL_DIR/scripts/macos/launcher.sh" "$INSTALL_DIR/scripts/macos/quit-server.sh"
chmod +x "$INSTALL_DIR/scripts/load-jarvix-port.sh"
chmod +x "$INSTALL_DIR/scripts/reset-session-logs.sh"
/bin/bash "$INSTALL_DIR/scripts/macos/rebuild-app.sh" | sed 's/^/    /'
ok "Jarvix.app created in ~/Applications"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔════════════════════════════════════════════════╗"
echo "  ║  ✅  Jarvix is installed!                      ║"
echo "  ║                                                ║"
echo "  ║      Opening Jarvix for you now...             ║"
echo "  ║                                                ║"
echo "  ║                                                ║"
echo "  ║     To open anytime:                           ║"
echo "  ║     Press ⌘ Space, type Jarvix, press Enter    ║"
echo "  ╚════════════════════════════════════════════════╝"
echo ""

/usr/bin/open "$APP_PATH"
