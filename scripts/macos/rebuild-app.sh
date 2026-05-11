#!/bin/bash
# Rebuilds ~/Applications/Jarvix.app in place without running the full install.
# Run this after pulling an update that changes the app bundle behaviour.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="$HOME/Applications/Jarvix.app"
LAUNCHER_SCRIPT="$INSTALL_DIR/scripts/macos/launcher.sh"
QUIT_SCRIPT="$INSTALL_DIR/scripts/macos/quit-server.sh"

echo "  → Rebuilding Jarvix.app..."

# ── 1. Start script ────────────────────────────────────────────────────────────
cat > "$LAUNCHER_SCRIPT" << 'HEREDOC'
#!/bin/bash
INSTALL_DIR="__PLACEHOLDER__"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"

if ! /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$INSTALL_DIR"
  nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
  for i in $(seq 1 30); do
    sleep 1
    /usr/bin/curl -fs --max-time 2 http://localhost:3000 >/dev/null 2>&1 && break
  done
fi
HEREDOC
sed -i '' "s|__PLACEHOLDER__|${INSTALL_DIR}|g" "$LAUNCHER_SCRIPT"
chmod +x "$LAUNCHER_SCRIPT"

# ── 2. Quit script ─────────────────────────────────────────────────────────────
cat > "$QUIT_SCRIPT" << 'HEREDOC'
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
/usr/bin/curl -s --max-time 3 -X POST http://localhost:3000/api/quit >/dev/null 2>&1 || true
sleep 1
PID="$(/usr/sbin/lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
[ -n "$PID" ] && kill "$PID" 2>/dev/null || true
HEREDOC
chmod +x "$QUIT_SCRIPT"

# ── 3. Compile stay-open AppleScript app ──────────────────────────────────────
APPLESCRIPT_TMP="/tmp/jarvix_launcher.applescript"
cat > "$APPLESCRIPT_TMP" << HEREDOC
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
HEREDOC

rm -rf "$APP_PATH"
osacompile -s -o "$APP_PATH" "$APPLESCRIPT_TMP"
rm -f "$APPLESCRIPT_TMP"

# ── 4. Apply icon and metadata ─────────────────────────────────────────────────
ICON_NAME="JarvixIcon"
REAL_PNG="/tmp/jarvix_icon_real.png"
ICONSET_DIR="/tmp/Jarvix.iconset"
mkdir -p "$ICONSET_DIR"
sips -s format png "$INSTALL_DIR/public/icon.png" --out "$REAL_PNG" >/dev/null 2>&1 \
  || cp "$INSTALL_DIR/public/icon.png" "$REAL_PNG"
for size in 16 32 128 256 512; do
  sips -z $size $size "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$REAL_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET_DIR" -o "$APP_PATH/Contents/Resources/${ICON_NAME}.icns" 2>/dev/null || true

plutil -replace CFBundleName          -string "Jarvix"              "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleDisplayName   -string "Jarvix"              "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIdentifier    -string "com.jarvix.launcher" "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconFile      -string "$ICON_NAME"          "$APP_PATH/Contents/Info.plist"
plutil -replace CFBundleIconName      -string "$ICON_NAME"          "$APP_PATH/Contents/Info.plist"

touch "$APP_PATH"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_PATH" 2>/dev/null || true
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true

echo "    ✓ Jarvix.app rebuilt — open ~/Applications/Jarvix.app to try it"
