#!/bin/bash
# scripts/relaunch.sh
#
# Spawned (detached) by /api/restart after an in-app update is applied.
# Waits for the running Next.js server to exit, then starts a fresh one
# in the background so the Jarvix.app launcher can re-attach to it.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"
/bin/bash "$INSTALL_DIR/scripts/reset-session-logs.sh"

# Make sure brew/node are reachable when launched detached from the server.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin:${PATH:-}"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"

# shellcheck source=load-jarvix-port.sh
source "$INSTALL_DIR/scripts/load-jarvix-port.sh"

echo "$(date): relaunch requested" >> "$LOG_DIR/relaunch.log"

# Wait up to 10s for the previous server to release our port.
for _ in $(seq 1 20); do
  /usr/sbin/lsof -ti:"$JARVIX_HTTP_PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done

# If something is still bound, force-kill it so the new server can start.
PID="$(/usr/sbin/lsof -ti:"$JARVIX_HTTP_PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
if [ -n "$PID" ]; then
  kill -TERM "$PID" 2>/dev/null || true
  sleep 1
  kill -KILL "$PID" 2>/dev/null || true
fi

cd "$INSTALL_DIR"
echo "$(date): starting fresh server" >> "$LOG_DIR/relaunch.log"

# Detach fully so this script can exit and macOS doesn't keep the
# old session group around.
nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
disown || true

# Wait up to 30s for the server to actually respond.
for i in $(seq 1 30); do
  sleep 1
  if /usr/bin/curl -fs --max-time 1 "http://127.0.0.1:${JARVIX_HTTP_PORT}/" >/dev/null 2>&1; then
    echo "$(date): server is responding (pid=$SERVER_PID)" >> "$LOG_DIR/relaunch.log"
    exit 0
  fi
  # If the process died, don't keep waiting.
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "$(date): server process died — check server.log" >> "$LOG_DIR/relaunch.log"
    exit 1
  fi
done
echo "$(date): server did not respond within 30s" >> "$LOG_DIR/relaunch.log"
