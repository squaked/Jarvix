#!/bin/bash
# Launches the Jarvix server (npm start) and waits for it to be ready.
# Called by Jarvix.app's AppleScript on run / on idle handlers, and by relaunch.sh.
#
# Path-independent: derives INSTALL_DIR from its own location so the same script
# works on every machine. Do NOT bake an install-specific path into this file.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"

LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"

if /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  exit 0
fi

cd "$INSTALL_DIR" || exit 1
nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
disown || true

# Wait up to 30 s for the server to respond before returning so the AppleScript
# applet can open the browser as soon as it's ready.
for _ in $(seq 1 30); do
  sleep 1
  if /usr/bin/curl -fs --max-time 2 http://localhost:3000 >/dev/null 2>&1; then
    exit 0
  fi
done
exit 0
