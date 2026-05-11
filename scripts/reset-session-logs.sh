#!/bin/bash
# Clears install logs under logs/ so they do not grow without bound.
# Keeps only the current server or update run — previous output is discarded.
set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$INSTALL_DIR/logs"
mkdir -p "$LOG_DIR"

for name in server.log update.log relaunch.log; do
  : > "$LOG_DIR/$name"
done
