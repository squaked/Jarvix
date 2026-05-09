#!/bin/bash
# Called by the com.jarvix.server LaunchAgent.
# Runs as a long-lived process; LaunchAgent restarts it if it exits.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"

# If another process already owns port 3000, exit cleanly so the LaunchAgent
# does not spin in a rapid restart loop due to KeepAlive.
if lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  exit 0
fi

# Ensure a built app exists before trying to start.
if [ ! -d ".next" ]; then
  npm install --silent
  npm run build --silent
fi

exec npm start
