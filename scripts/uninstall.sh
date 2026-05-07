#!/bin/bash
set -euo pipefail

INSTALL_DIR="${JARVIX_INSTALL_DIR:-$HOME/.jarvix-app}"
SERVER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.server.plist"
UPDATER_PLIST="$HOME/Library/LaunchAgents/com.jarvix.updater.plist"
APP_PATH="$HOME/Applications/Jarvix.app"

echo ""
echo "  Uninstalling Jarvix..."

launchctl unload "$SERVER_PLIST"  2>/dev/null || true
launchctl unload "$UPDATER_PLIST" 2>/dev/null || true

rm -f  "$SERVER_PLIST"
rm -f  "$UPDATER_PLIST"
rm -rf "$APP_PATH"
rm -rf "$INSTALL_DIR"

echo ""
echo "  ✓ Jarvix removed."
echo ""
echo "  Your chat history and settings are kept at:"
echo "    ~/.jarvix-data  (or ~/.jarvis-data if that's where your data lives)"
echo "  Delete that folder manually if you want a full clean slate."
echo ""
