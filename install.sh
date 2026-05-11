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
if ! command -v brew &>/dev/null; then
  step "Installing Homebrew (this may ask for your password)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Initialize brew for this session
  if [ -f "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -f "/usr/local/bin/brew" ]; then
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
step "Creating Jarvix app launcher..."
mkdir -p "$HOME/Applications"
mkdir -p "$INSTALL_DIR/scripts/macos"

# 1. Start script – ensures the server is up then returns (no infinite loop).
#    Called by the AppleScript's on run handler and the idle watchdog.
LAUNCHER_SCRIPT="$INSTALL_DIR/scripts/macos/launcher.sh"
cat > "$LAUNCHER_SCRIPT" << 'APPSCRIPT'
#!/bin/bash
INSTALL_DIR="__JARVIX_INSTALL_DIR_PLACEHOLDER__"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"

if ! /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$INSTALL_DIR"
  nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
  # Wait up to 30 s for the server to respond before returning.
  for i in $(seq 1 30); do
    sleep 1
    /usr/bin/curl -fs --max-time 2 http://localhost:3000 >/dev/null 2>&1 && break
  done
fi
APPSCRIPT
sed -i '' "s|__JARVIX_INSTALL_DIR_PLACEHOLDER__|${INSTALL_DIR}|g" "$LAUNCHER_SCRIPT"
chmod +x "$LAUNCHER_SCRIPT"

# 2. Quit script – graceful API call then force-kill fallback.
QUIT_SCRIPT="$INSTALL_DIR/scripts/macos/quit-server.sh"
cat > "$QUIT_SCRIPT" << 'QUITSCRIPT'
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
/usr/bin/curl -s --max-time 3 -X POST http://localhost:3000/api/quit >/dev/null 2>&1 || true
sleep 1
PID="$(/usr/sbin/lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
[ -n "$PID" ] && kill "$PID" 2>/dev/null || true
QUITSCRIPT
chmod +x "$QUIT_SCRIPT"

# 3. Build stay-open .app bundle with proper Dock lifecycle.
#    -s  → stay-open applet: process persists → Dock shows the running dot.
#    on run    – start server + open browser
#    on reopen – re-open browser when Dock icon clicked while already running
#    on idle   – silent watchdog every 30 s; restarts server if it died
#    on quit   – graceful /api/quit + force-kill when user does Cmd+Q or Dock > Quit
APPLESCRIPT_TMP="/tmp/jarvix_launcher.applescript"
cat > "$APPLESCRIPT_TMP" << APPLESCRIPT
property installDir : "${INSTALL_DIR}"

on run
    do shell script quoted form of "${LAUNCHER_SCRIPT}"
    open location "http://localhost:3000"
end run

on reopen
    open location "http://localhost:3000"
end reopen

on idle
    set serverUp to (do shell script "if /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then echo yes; else echo no; fi")
    if serverUp is "no" then
        do shell script "'${LAUNCHER_SCRIPT}' >/dev/null 2>&1 &"
    end if
    return 30
end idle

on quit
    do shell script quoted form of "${QUIT_SCRIPT}"
    continue quit
end quit
APPLESCRIPT

rm -rf "$APP_PATH"
osacompile -s -o "$APP_PATH" "$APPLESCRIPT_TMP"
rm -f "$APPLESCRIPT_TMP"

# 4. Apply Icon and Metadata
ICON_NAME="JarvixIcon"
REAL_PNG="/tmp/jarvix_icon_real.png"
ICONSET_DIR="/tmp/Jarvix.iconset"
mkdir -p "$ICONSET_DIR"
sips -s format png "$INSTALL_DIR/public/icon.png" --out "$REAL_PNG" > /dev/null 2>&1 || cp "$INSTALL_DIR/public/icon.png" "$REAL_PNG"
for size in 16 32 128 256 512; do
  sips -z $size $size "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" > /dev/null
  sips -z $((size * 2)) $((size * 2)) "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" > /dev/null
done
iconutil -c icns "$ICONSET_DIR" -o "$APP_PATH/Contents/Resources/${ICON_NAME}.icns" 2>/dev/null || true

plutil -replace CFBundleName -string "Jarvix" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleDisplayName -string "Jarvix" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string "com.jarvix.launcher" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconFile -string "$ICON_NAME" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconName -string "$ICON_NAME" "$APP_PATH/Contents/Info.plist"

touch "$APP_PATH"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_PATH"
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true
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
