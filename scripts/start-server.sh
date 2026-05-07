#!/bin/bash
# Called by the com.jarvix.server LaunchAgent.
# Runs as a long-lived process; LaunchAgent restarts it if it exits.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"

# Ensure a built app exists before trying to start.
if [ ! -d ".next" ]; then
  echo "$(date): No build found — running first-time build..."
  npm install --silent
  npm run build --silent
  echo "$(date): Build complete."
fi

echo "$(date): Starting Jarvix server..."
exec npm start
