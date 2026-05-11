#!/bin/bash
INSTALL_DIR="/Users/Shared/Jarvix"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
export JARVIX_INSTALL_DIR="$INSTALL_DIR"
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"

if ! /usr/sbin/lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$INSTALL_DIR"
  nohup npm start >> "$LOG_DIR/server.log" 2>&1 &
  for i in $(seq 1 30); do
    sleep 1
    /usr/bin/curl -fs --max-time 2 http://localhost:3000 >/dev/null 2>&1 && break
  done
fi
