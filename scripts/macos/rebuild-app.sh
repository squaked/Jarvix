#!/bin/bash
# Rebuilds ~/Applications/Jarvix.app in place without running the full install.
# Run this after pulling an update that changes the app bundle behaviour.
#
# The shell scripts called from the bundle (launcher.sh, quit-server.sh) are now
# checked into git and path-independent — this script no longer regenerates them.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="$HOME/Applications/Jarvix.app"
LAUNCHER_SCRIPT="$INSTALL_DIR/scripts/macos/launcher.sh"
QUIT_SCRIPT="$INSTALL_DIR/scripts/macos/quit-server.sh"

echo "  → Rebuilding Jarvix.app..."

# ── 1. Sanity: make sure the static scripts the applet calls actually exist ──
for f in "$LAUNCHER_SCRIPT" "$QUIT_SCRIPT"; do
  if [ ! -f "$f" ]; then
    echo "    ✗ Missing required script: $f" >&2
    echo "      Run \`git checkout -- scripts/macos/\` and try again." >&2
    exit 1
  fi
  chmod +x "$f"
done

# ── 2. Stop any currently-running applet instances and stale launcher loops ──
/usr/bin/pkill -f "Applications/Jarvix.app/Contents/MacOS/applet" 2>/dev/null || true
/usr/bin/pkill -f "Applications/Jarvix.app/Contents/MacOS/Jarvix" 2>/dev/null || true
/usr/bin/pkill -f "macos/launcher.sh" 2>/dev/null || true
sleep 1

# ── 3. Compile stay-open AppleScript app ─────────────────────────────────────
#   on run     - dedup any other applet, start server, open browser
#   on reopen  - reopen the browser when Dock icon is clicked
#   on idle    - silent watchdog every 30 s; restarts server if it died
#   on quit    - graceful /api/quit + force-kill, then *always* continue quit
APPLESCRIPT_TMP="/tmp/jarvix_launcher.applescript"
cat > "$APPLESCRIPT_TMP" << HEREDOC
property installDir : "${INSTALL_DIR}"
property launcherScript : "${LAUNCHER_SCRIPT}"
property quitScript : "${QUIT_SCRIPT}"

on run
    -- Avoid two applet instances holding the Dock icon at once: kill every
    -- "applet" process whose pid is not our own (\$PPID inside do shell script
    -- is the applet itself, since the applet spawns the shell).
    try
        do shell script "ME=\$PPID; /usr/bin/pgrep -f 'Applications/Jarvix.app/Contents/MacOS/applet' | while read p; do [ \"\$p\" != \"\$ME\" ] && kill \"\$p\" 2>/dev/null; done; /usr/bin/pkill -f 'Applications/Jarvix.app/Contents/MacOS/Jarvix' 2>/dev/null; /usr/bin/pkill -f 'macos/launcher.sh' 2>/dev/null; true"
    end try
    try
        do shell script "/bin/bash " & quoted form of launcherScript
    end try
    try
        open location "http://localhost:3000"
    end try
end run

on reopen
    try
        open location "http://localhost:3000"
    end try
end reopen

on idle
    try
        set serverUp to (do shell script "if /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then echo yes; else echo no; fi")
        if serverUp is "no" then
            do shell script "/bin/bash " & quoted form of launcherScript & " >/dev/null 2>&1 &"
        end if
    end try
    return 30
end idle

on quit
    -- CRITICAL: must always reach \`continue quit\`, even if the quit script
    -- errors or is missing. Otherwise the applet refuses to terminate and
    -- the Dock "Quit" command appears to do nothing.
    try
        do shell script "/bin/bash " & quoted form of quitScript
    end try
    continue quit
end quit
HEREDOC

rm -rf "$APP_PATH"
osacompile -s -o "$APP_PATH" "$APPLESCRIPT_TMP"
rm -f "$APPLESCRIPT_TMP"

# ── 4. Apply icon and metadata ───────────────────────────────────────────────
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
# LSMultipleInstancesProhibited tells LaunchServices to refuse a second
# `open -a Jarvix` while one is already running — another defense against
# duplicate applet instances.
plutil -replace LSMultipleInstancesProhibited -bool true             "$APP_PATH/Contents/Info.plist"

touch "$APP_PATH"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_PATH" 2>/dev/null || true
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true

echo "    ✓ Jarvix.app rebuilt — open ~/Applications/Jarvix.app to try it"
