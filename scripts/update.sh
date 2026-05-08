#!/bin/bash
# Called nightly by the com.jarvix.updater LaunchAgent.
# Pulls latest code and rebuilds only when there are actual changes.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"

echo "$(date): Checking for updates..."

# Fetch without merging so we can compare
git fetch origin 2>&1 || { echo "$(date): Network unavailable, skipping update."; exit 0; }

BEFORE=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "@{u}" 2>/dev/null || echo "$BEFORE")

if [ "$BEFORE" = "$REMOTE" ]; then
  echo "$(date): Already up to date."
  exit 0
fi

echo "$(date): Updates found — pulling and rebuilding..."
git pull --ff-only 2>&1

# Only reinstall deps if package-lock.json changed
if git diff --name-only "$BEFORE" HEAD | grep -q "package-lock.json\|package.json"; then
  echo "$(date): Dependencies changed — running npm install..."
  npm install --silent
fi

npm run build --silent
echo "$(date): Build complete."

# Signal to the running server that an update is ready.
# The server shows a "Restart to update" banner; the user restarts at their convenience.
touch "$INSTALL_DIR/.update-ready"
echo "$(date): Update ready — banner will appear in the Jarvix UI."
