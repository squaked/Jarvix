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
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null \
    || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null \
    || fail "Homebrew installed but could not be found."
  ok "Homebrew installed"
else
  ok "Homebrew found"
fi

# ── 2. Git / Xcode Tools ──────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  step "Installing Git..."
  xcode-select --install 2>/dev/null || true
  for i in $(seq 1 36); do sleep 5; command -v git &>/dev/null && break; done
  command -v git &>/dev/null || fail "Git is required."
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
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/update.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/update.log</string>
</dict>
</plist>
PLIST

launchctl unload "$UPDATER_PLIST" 2>/dev/null || true
launchctl load "$UPDATER_PLIST"
ok "Auto-updater installed"

# ── 9. Jarvix.app in ~/Applications ───────────────────────────────────────────
step "Creating Jarvix app launcher (using native AppleScript wrapper)..."
mkdir -p "$HOME/Applications"

# 1. Create the bash launcher script
LAUNCHER_SCRIPT="$INSTALL_DIR/scripts/macos/launcher.sh"
mkdir -p "$(dirname "$LAUNCHER_SCRIPT")"

cat > "$LAUNCHER_SCRIPT" << 'APPSCRIPT'
#!/bin/bash
# This script is called by the Jarvix.app wrapper.

INSTALL_DIR="__JARVIX_INSTALL_DIR_PLACEHOLDER__"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"

# Cleanup on quit
cleanup() {
  local pid
  pid="$(/usr/sbin/lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

# Start server if needed
if ! /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$INSTALL_DIR"
  nohup npm start >> "$INSTALL_DIR/logs/server.log" 2>&1 &
  disown || true
fi

# Open browser immediately
/usr/bin/open "http://localhost:3000"

# Stay alive to monitor server
while true; do
  if ! /usr/bin/curl -fs --max-time 3 http://localhost:3000 >/dev/null 2>&1; then
    # Try restart after 60s down
    sleep 60
    if ! /usr/bin/curl -fs --max-time 3 http://localhost:3000 >/dev/null 2>&1; then
       cd "$INSTALL_DIR"
       nohup npm start >> "$INSTALL_DIR/logs/server.log" 2>&1 &
       disown || true
    fi
  fi
  sleep 10
done
APPSCRIPT

sed -i '' "s|__JARVIX_INSTALL_DIR_PLACEHOLDER__|${INSTALL_DIR}|g" "$LAUNCHER_SCRIPT"
chmod +x "$LAUNCHER_SCRIPT"

# 2. Use osacompile to create a real .app that doesn't bounce
# This signals "finished launching" immediately.
rm -rf "$APP_PATH"
osacompile -o "$APP_PATH" -e "do shell script \"$LAUNCHER_SCRIPT > /dev/null 2>&1 &\""

# 3. Apply the icon and Info.plist settings to the new bundle
mkdir -p "$APP_PATH/Contents/Resources"
REAL_PNG="/tmp/jarvix_icon_real.png"
ICONSET_DIR="/tmp/Jarvix.iconset"
mkdir -p "$ICONSET_DIR"
sips -s format png "$INSTALL_DIR/public/icon.png" --out "$REAL_PNG" > /dev/null 2>&1 || cp "$INSTALL_DIR/public/icon.png" "$REAL_PNG"
for size in 16 32 128 256 512; do
  sips -z $size $size "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" > /dev/null
  sips -z $((size * 2)) $((size * 2)) "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" > /dev/null
done
iconutil -c icns "$ICONSET_DIR" -o "$APP_PATH/Contents/Resources/applet.icns" 2>/dev/null || true

# Update Info.plist to be more "App-like"
plutil -replace CFBundleName -string "Jarvix" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleDisplayName -string "Jarvix" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string "com.jarvix.launcher" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconFile -string "applet" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconName -string "applet" "$APP_PATH/Contents/Info.plist"

# Refresh the icon cache
touch "$APP_PATH"
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true
ok "Jarvix.app created in ~/Applications (Native AppleScript wrapper)"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔════════════════════════════════════════════════╗"
echo "  ║  ✅  Jarvix is installed!                      ║"
echo "  ║                                                ║"
echo "  ║  How to open:                                  ║"
echo "  ║  Press ⌘ Space, type Jarvix, press Enter       ║"
echo "  ╚════════════════════════════════════════════════╝"
echo ""
