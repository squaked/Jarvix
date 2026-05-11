#!/bin/bash
# Called by the com.jarvix.server LaunchAgent (RunAtLoad, KeepAlive: false).
# Runs as a long-lived process. Not auto-restarted on exit by launchd.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"

# shellcheck source=load-jarvix-port.sh
source "$INSTALL_DIR/scripts/load-jarvix-port.sh"

# If another process already owns our port, exit cleanly so the LaunchAgent
# does not spin in a rapid restart loop due to KeepAlive.
if lsof -ti:"$JARVIX_HTTP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  exit 0
fi

# Ensure a built app exists before trying to start.
if [ ! -d ".next" ]; then
  npm install --silent
  npm run build --silent
fi

# Check for updates in the background so startup is not delayed.
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"
/bin/bash "$INSTALL_DIR/scripts/reset-session-logs.sh"
UPDATE_LOG="$LOG_DIR/update.log"
bash "$INSTALL_DIR/scripts/update.sh" >> "$UPDATE_LOG" 2>&1 &

exec npm start
