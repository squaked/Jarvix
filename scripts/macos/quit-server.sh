#!/bin/bash
# Stops the Jarvix server: graceful /api/quit, then force-kill anything still
# listening on the Jarvix HTTP port (see scripts/jarvix.port), then unloads the
# LaunchAgent for this session so it does not get respawned during the same login.
#
# Called by Jarvix.app's `on quit` handler. Must always exit 0 so AppleScript
# does not bail out before `continue quit`.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../load-jarvix-port.sh
source "$INSTALL_DIR/scripts/load-jarvix-port.sh"

/usr/bin/curl -s --max-time 3 -X POST "http://127.0.0.1:${JARVIX_HTTP_PORT}/api/quit" >/dev/null 2>&1 || true
sleep 1

for PID in $(/usr/sbin/lsof -ti:"$JARVIX_HTTP_PORT" -sTCP:LISTEN 2>/dev/null); do
  kill "$PID" 2>/dev/null || true
done
sleep 1
for PID in $(/usr/sbin/lsof -ti:"$JARVIX_HTTP_PORT" -sTCP:LISTEN 2>/dev/null); do
  kill -9 "$PID" 2>/dev/null || true
done

# Stop any orphaned launcher.sh polling loops left over from previous on-idle
# watchdog runs (each runs a 30 s curl-poll, they accumulate over time).
/usr/bin/pkill -f "macos/launcher.sh" 2>/dev/null || true

# Stop the LaunchAgent for this login session so it doesn't immediately bring
# the server back up. It will load again on next login because RunAtLoad=true.
launchctl unload "$HOME/Library/LaunchAgents/com.jarvix.server.plist" 2>/dev/null || true

exit 0
