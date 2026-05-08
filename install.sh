#!/bin/bash
set -euo pipefail

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
if ! command -v brew &>/dev/null; then
  step "Installing Homebrew (this may ask for your password)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon and Intel
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null \
    || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null \
    || fail "Homebrew installed but could not be found — open a new terminal and re-run this script."
  ok "Homebrew installed"
else
  ok "Homebrew found"
fi

# ── 2. Git / Xcode Command Line Tools ────────────────────────────────────────
if ! command -v git &>/dev/null; then
  step "Installing Git (Xcode Command Line Tools)..."
  xcode-select --install 2>/dev/null || true
  # Wait for the installation to complete (up to 3 minutes)
  for i in $(seq 1 36); do
    sleep 5
    command -v git &>/dev/null && break
  done
  command -v git &>/dev/null || fail "Git is required. Install Xcode Command Line Tools, then re-run this script."
  ok "Git installed"
else
  ok "Git found ($(git --version | awk '{print $3}'))"
fi

# ── 3. Node.js ─────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  step "Installing Node.js..."
  brew install node
  ok "Node.js installed"
else
  ok "Node.js found ($(node --version))"
fi

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
NODE_DIR="$(dirname "$NODE_BIN")"

# ── 4. Clone or update repo ────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  step "Updating Jarvix..."
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
ok "Build complete"

# ── 6. Log directory ───────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

# ── 7. Server LaunchAgent ──────────────────────────────────────────────────────
step "Setting up background service (auto-start on login)..."
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

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/server.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/server.log</string>
</dict>
</plist>
PLIST

launchctl unload "$SERVER_PLIST" 2>/dev/null || true
launchctl load "$SERVER_PLIST"
ok "Background service installed"

# ── 8. Auto-updater LaunchAgent (daily at 3 AM) ────────────────────────────────
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
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/update.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/update.log</string>
</dict>
</plist>
PLIST

launchctl unload "$UPDATER_PLIST" 2>/dev/null || true
launchctl load "$UPDATER_PLIST"
ok "Auto-updater installed (runs nightly at 3 AM)"

# ── 9. Jarvix.app in ~/Applications ───────────────────────────────────────────
step "Creating Jarvix app launcher..."
mkdir -p "$HOME/Applications"
mkdir -p "$APP_PATH/Contents/MacOS"

cat > "$APP_PATH/Contents/MacOS/Jarvix" << 'APPSCRIPT'
#!/bin/bash
# Jarvix.app — the server runs while this app is open.
# Quitting the app (Cmd+Q or Dock → Quit) stops the server.

INSTALL_DIR="JARVIX_INSTALL_DIR"  # substituted below by sed

# Add Homebrew node to PATH (Apple Silicon + Intel).
for d in /opt/homebrew/bin /usr/local/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done

# ── Quit handler ───────────────────────────────────────────────────────
# macOS sends SIGTERM when the user quits via Dock or Cmd+Q.
cleanup() {
  local pid
  pid="$(lsof -ti:3000 2>/dev/null | head -1)"
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      sleep 1
      lsof -ti:3000 >/dev/null 2>&1 || break
    done
  fi
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

# ── Start server if not already running ───────────────────────────────
SERVER_PID=""
if ! lsof -ti:3000 >/dev/null 2>&1; then
  mkdir -p "$INSTALL_DIR/logs"
  cd "$INSTALL_DIR"
  npm start >> "$INSTALL_DIR/logs/server.log" 2>&1 &
  SERVER_PID=$!
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    sleep 1
    curl -s --max-time 1 http://localhost:3000 >/dev/null 2>&1 && break
  done
fi

# ── Open the browser ──────────────────────────────────────────────────
open "http://localhost:3000"

# ── Stay alive so the Dock icon remains ───────────────────────────────
if [ -n "$SERVER_PID" ]; then
  # We started the server — wait on it directly.
  wait "$SERVER_PID" 2>/dev/null || true
else
  # Server was already running (e.g. from login LaunchAgent) —
  # loop until it disappears or SIGTERM arrives.
  while lsof -ti:3000 >/dev/null 2>&1; do
    sleep 5
  done
fi
APPSCRIPT

# Bake the install path into the script (avoids variable-expansion issues in heredoc).
sed -i '' "s|JARVIX_INSTALL_DIR|${INSTALL_DIR}|g" "$APP_PATH/Contents/MacOS/Jarvix"
chmod +x "$APP_PATH/Contents/MacOS/Jarvix"

cat > "$APP_PATH/Contents/Info.plist" << INFOPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Jarvix</string>
  <key>CFBundleIdentifier</key>
  <string>com.jarvix.launcher</string>
  <key>CFBundleName</key>
  <string>Jarvix</string>
  <key>CFBundleDisplayName</key>
  <string>Jarvix</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSUIElement</key>
  <false/>
</dict>
</plist>
INFOPLIST

# Clear quarantine flag so macOS doesn't block the app
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true
ok "Jarvix.app created in ~/Applications"


# ── 9. Open in browser ─────────────────────────────────────────────────────────
step "Starting Jarvix..."
sleep 4
open "http://localhost:3000" 2>/dev/null || true

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔════════════════════════════════════════════════╗"
echo "  ║  ✅  Jarvix is installed and running!          ║"
echo "  ║                                                ║"
echo "  ║  Open:    http://localhost:3000                ║"
echo "  ║  App:     ~/Applications/Jarvix.app            ║"
echo "  ║  Updates: automatic nightly + in-app button    ║"
echo "  ╚════════════════════════════════════════════════╝"
echo ""
echo "  Tip: drag Jarvix from ~/Applications to your Dock"
echo "  for one-click access. When an update is ready, a"
echo "  'Restart to apply' button will appear in the app."
echo ""
