#!/bin/bash
# scripts/update.sh
#
# Triggered by:
#   • the com.jarvix.updater LaunchAgent (every 30 minutes), and
#   • the in-app "Check for updates" button (POST /api/check-updates).
#
# Pulls latest code and rebuilds only when there are actual changes.
# On success, touches `.update-ready` so the running server's UpdateBanner
# can prompt the user to restart at their convenience.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"

LOG_PREFIX="$(date '+%Y-%m-%d %H:%M:%S')"
log() { echo "$LOG_PREFIX: $*"; }

# ── Concurrency guard ──────────────────────────────────────────────────
# Avoid two updates running at the same time (LaunchAgent + manual check).
# We use a directory as a lock because it's atomic and works without flock.
LOCK_DIR="$INSTALL_DIR/.update.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Another update is already in progress — skipping."
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# Make sure we have git/node on PATH when launched from launchd.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin:${PATH:-}"

# ── Bail if this isn't a git checkout ─────────────────────────────────
if [ ! -d ".git" ]; then
  log "Not a git checkout — skipping update."
  exit 0
fi

log "Checking for updates..."

# Fetch without merging so we can compare.
if ! git fetch origin 2>&1; then
  log "Network unavailable — skipping update."
  exit 0
fi

BEFORE="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse '@{u}' 2>/dev/null || echo "$BEFORE")"

if [ "$BEFORE" = "$REMOTE" ]; then
  log "Already up to date."
  exit 0
fi

log "Updates found — pulling and rebuilding..."

# Refuse to clobber local edits — surface this clearly in the log.
if ! git pull --ff-only 2>&1; then
  log "git pull --ff-only failed (local changes or non-FF history). Aborting."
  exit 1
fi

# Only reinstall deps if package-lock.json or package.json changed.
if git diff --name-only "$BEFORE" HEAD | grep -qE '^(package\.json|package-lock\.json)$'; then
  log "Dependencies changed — running npm install..."
  npm install --silent
fi

npm run build --silent
log "Build complete."

# Signal to the running server that an update is ready.
touch "$INSTALL_DIR/.update-ready"
log "Update ready — banner will appear in the Jarvix UI."
