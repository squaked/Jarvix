#!/bin/bash
set -euo pipefail

INSTALL_DIR="${JARVIX_INSTALL_DIR:-$HOME/.jarvix-app}"
SERVER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.server.plist"
UPDATER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.updater.plist"
APP_PATH="$HOME/Applications/Jarvix.app"

echo ""
echo "  Uninstalling Jarvix..."

# Stop the server if it is running.
SERVER_PID="$(/usr/sbin/lsof -ti:3000 2>/dev/null | head -1)"
if [ -n "$SERVER_PID" ]; then
  kill "$SERVER_PID" 2>/dev/null || true
  sleep 2
fi

launchctl unload "$SERVER_PLIST"  2>/dev/null || true
launchctl unload "$UPDATER_PLIST" 2>/dev/null || true

rm -f  "$SERVER_PLIST"
rm -f  "$UPDATER_PLIST"
rm -rf "$APP_PATH"
rm -rf "$INSTALL_DIR"
rm -rf "$HOME/.jarvix-data"
rm -rf "$HOME/.jarvis-data"

echo ""
echo "  ✓ Jarvix removed."
echo ""
