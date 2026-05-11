#!/bin/bash
# Loads JARVIX_HTTP_PORT and PORT from scripts/jarvix.port (single line: port number).
# Override for testing: export JARVIX_HTTP_PORT=... before sourcing.
_port_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_port_file="${_port_dir}/jarvix.port"
_default=47389
if [ -n "${JARVIX_HTTP_PORT:-}" ] && [[ "${JARVIX_HTTP_PORT}" =~ ^[0-9]+$ ]]; then
  :
elif [ -f "$_port_file" ]; then
  JARVIX_HTTP_PORT="$(tr -d '[:space:]' < "$_port_file" | head -1)"
else
  JARVIX_HTTP_PORT="$_default"
fi
if ! [[ "${JARVIX_HTTP_PORT}" =~ ^[0-9]+$ ]] || [ "$JARVIX_HTTP_PORT" -lt 1024 ] || [ "$JARVIX_HTTP_PORT" -gt 65535 ]; then
  JARVIX_HTTP_PORT="$_default"
fi
export JARVIX_HTTP_PORT
export PORT="$JARVIX_HTTP_PORT"
