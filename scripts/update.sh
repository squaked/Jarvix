#!/bin/bash
# scripts/update.sh
#
# Triggered by:
#   • the com.jarvix.updater LaunchAgent (every 6 hours),
#   • server startup (scripts/start-server.sh), and
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
if [ -d "$LOCK_DIR" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -gt 1800 ]; then
    log "Breaking stale lock (age: ${LOCK_AGE}s)."
    rmdir "$LOCK_DIR" 2>/dev/null || rm -rf "$LOCK_DIR"
  else
    log "Another update is already in progress (age: ${LOCK_AGE}s) — skipping."
    exit 0
  fi
fi
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Could not acquire lock — skipping."
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

BEHIND="$(git rev-list HEAD..origin/main --count 2>/dev/null || echo 0)"
BEFORE="$(git rev-parse HEAD)"

if [ "$BEHIND" -eq 0 ]; then
  log "Already up to date."
  exit 0
fi

log "Updates found — pulling and rebuilding..."

# Save the current HEAD so we can roll back if the build fails.
ROLLBACK_REV="$BEFORE"

# Older installs created these via rebuild-app.sh before they lived in git. If they
# are still untracked, `git pull` aborts with "would be overwritten by merge".
for f in scripts/macos/launcher.sh scripts/macos/quit-server.sh; do
  if [ -f "$f" ] && ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    log "Removing untracked $f (blocks pull) — version from the repo will be used."
    rm -f "$f"
  fi
done

# Prefer a fast-forward; if that fails (local edits, divergent branch), match
# origin/main exactly — this install is treated as an app bundle, not a dev fork.
if ! git pull --ff-only 2>&1; then
  log "Fast-forward pull failed — syncing checkout to origin/main (discards local edits)."
  if ! git fetch origin || ! git reset --hard origin/main; then
    log "Could not sync with origin/main. Aborting."
    exit 1
  fi
fi

# Only reinstall deps if package-lock.json or package.json changed.
if git diff --name-only "$ROLLBACK_REV" HEAD | grep -qE '^(package\.json|package-lock\.json)$'; then
  log "Dependencies changed — running npm install..."
  if ! npm install --silent; then
    log "npm install failed — rolling back to $ROLLBACK_REV."
    git reset --hard "$ROLLBACK_REV"
    exit 1
  fi
fi

if ! npm run build --silent; then
  log "Build failed — rolling back to $ROLLBACK_REV."
  git reset --hard "$ROLLBACK_REV"
  npm run build --silent 2>/dev/null || true   # best-effort rebuild old version
  exit 1
fi
log "Build complete."

# Ensure the install-specific scripts exist (they are gitignored, so a pull
# that previously deleted them from tracking can leave them missing).
QUIT_SCRIPT="$INSTALL_DIR/scripts/macos/quit-server.sh"
if [ ! -f "$QUIT_SCRIPT" ]; then
  log "Restoring missing quit-server.sh..."
  cat > "$QUIT_SCRIPT" << 'HEREDOC'
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
/usr/bin/curl -s --max-time 3 -X POST http://localhost:3000/api/quit >/dev/null 2>&1 || true
sleep 1
PID="$(/usr/sbin/lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
[ -n "$PID" ] && kill "$PID" 2>/dev/null || true
HEREDOC
  chmod +x "$QUIT_SCRIPT"
fi

# Signal to the running server that an update is ready.
# Write the NEW rev so the status endpoint can reconcile without git.
git rev-parse HEAD > "$INSTALL_DIR/.update-ready"
log "Update ready — banner will appear in the Jarvix UI."
