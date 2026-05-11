# shellcheck shell=bash
# Sourced by start-server.sh, launcher.sh, relaunch.sh, uninstall.sh, and npm dev.
# Default port must match the digit in scripts/jarvix.port (fallback below).
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
_RAW=""
if [ -r "${_SCRIPT_DIR}/jarvix.port" ]; then
  IFS= read -r _RAW <"${_SCRIPT_DIR}/jarvix.port" || _RAW=""
fi
_DEFAULT="$(echo "${_RAW}" | tr -d '[:space:]')"

if ! [[ "${_DEFAULT}" =~ ^[0-9]+$ ]] || [ "${_DEFAULT}" -lt 1 ] || [ "${_DEFAULT}" -gt 65535 ]; then
  _DEFAULT=52741
fi

JARVIX_HTTP_PORT="${JARVIX_HTTP_PORT:-${_DEFAULT}}"
export JARVIX_HTTP_PORT
export PORT="${PORT:-${JARVIX_HTTP_PORT}}"
