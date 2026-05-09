#!/bin/bash
set -euo pipefail

INSTALL_DIR="${JARVIX_INSTALL_DIR:-$HOME/.jarvix-app}"
SERVER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.server.plist"
UPDATER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.updater.plist"
APP_PATH="$HOME/Applications/Jarvix.app"

echo ""
echo "  Uninstalling Jarvix..."

# 1. Disable LaunchAgents first so they don't relaunch the server we're
#    about to kill.
launchctl unload "$SERVER_PLIST"  2>/dev/null || true
launchctl unload "$UPDATER_PLIST" 2>/dev/null || true

# 2. Quit the .app launcher (its SIGTERM trap kills the server).
osascript -e 'tell application "Jarvix" to quit' 2>/dev/null || true
sleep 1

# 3. Belt-and-braces: kill anything still bound to port 3000.
SERVER_PID="$(/usr/sbin/lsof -ti:3000 2>/dev/null | head -1 || true)"
if [ -n "$SERVER_PID" ]; then
  kill "$SERVER_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$SERVER_PID" 2>/dev/null || true
fi

# 4. Remove plists, app, and code/data.
rm -f  "$SERVER_PLIST"
rm -f  "$UPDATER_PLIST"
rm -rf "$APP_PATH"
rm -rf "$INSTALL_DIR"
rm -rf "$HOME/.jarvix-data"
rm -rf "$HOME/.jarvis-data"

echo ""
echo "  ✓ Jarvix removed."
echo ""
