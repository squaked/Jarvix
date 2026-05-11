#!/usr/bin/env bash
# Builds the Jarvix EventKit helper app (JarvixEventKitHelper.app).
#
# This binary is what macOS shows as "Jarvix" under System Settings →
# Privacy & Security → Calendars. macOS TCC keys calendar permission on:
#
#   (bundle identifier) + (designated requirement / CDHash)
#
# So if the binary's code signature changes, the previously-granted TCC entry
# becomes stale and reads silently fail even though the toggle is still on.
#
# Two guards against that:
#
#   1. Skip rebuilding entirely when sources are older than the existing
#      binary — keeps the same CDHash across `npm install` / install.sh re-runs.
#   2. Use a *persistent* self-signed identity from the user's login keychain
#      instead of ad-hoc signing (`codesign -s -`). Ad-hoc signing produces a
#      fresh CDHash every build, which invalidates TCC.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/JarvixEventKitHelper.app"
BIN_DIR="$APP/Contents/MacOS"
BIN="$BIN_DIR/JarvixEventKitHelper"
SRC="$ROOT/main.swift"
PLIST="$ROOT/Info.plist"

mkdir -p "$BIN_DIR"
cp "$PLIST" "$APP/Contents/Info.plist"

# ── 1. Skip rebuild if sources haven't changed ────────────────────────────────
needs_rebuild=1
if [ -x "$BIN" ] && [ "$BIN" -nt "$SRC" ] && [ "$BIN" -nt "$PLIST" ]; then
  needs_rebuild=0
fi

if [ "$needs_rebuild" -eq 1 ]; then
  swiftc -O -whole-module-optimization -o "$BIN" "$SRC"
  chmod +x "$BIN"
fi

# ── 2. Persistent codesign identity ────────────────────────────────────────────
# Stored in a dedicated keychain under the install dir so rebuilds reuse it.
# Falls back to ad-hoc only if we genuinely cannot create/load the identity
# (e.g. on a sandboxed runner where security(1) is blocked).
sign_identity=""
if command -v security >/dev/null 2>&1 && command -v openssl >/dev/null 2>&1; then
  KEYCHAIN_DIR="$ROOT/.signing"
  KEYCHAIN="$KEYCHAIN_DIR/jarvix-helper.keychain-db"
  KEY_LABEL="Jarvix EventKit Helper Signing"
  # Random per-machine password; created once and reused.
  PW_FILE="$KEYCHAIN_DIR/keychain.pw"
  mkdir -p "$KEYCHAIN_DIR"
  if [ ! -f "$PW_FILE" ]; then
    openssl rand -hex 24 > "$PW_FILE"
    chmod 600 "$PW_FILE"
  fi
  PW="$(cat "$PW_FILE")"

  if [ ! -f "$KEYCHAIN" ]; then
    security create-keychain -p "$PW" "$KEYCHAIN" >/dev/null 2>&1 || true
  fi
  security unlock-keychain -p "$PW" "$KEYCHAIN" >/dev/null 2>&1 || true
  security set-keychain-settings -lut 100000000 "$KEYCHAIN" >/dev/null 2>&1 || true

  # NB: `find-identity -v` only lists certs whose chain validates against the
  # system trust store, which our self-signed cert doesn't. `-p codesigning`
  # lists code-signing identities regardless of validation state.
  identity_hash() {
    security find-identity -p codesigning "$KEYCHAIN" 2>/dev/null \
      | awk -v lbl="$KEY_LABEL" '$0 ~ lbl {print $2; exit}'
  }

  if [ -z "$(identity_hash)" ]; then
    # Generate a self-signed code-signing cert valid for ~10 years.
    CONF="$KEYCHAIN_DIR/cert.conf"
    cat > "$CONF" <<EOF
[ req ]
distinguished_name = dn
prompt = no
x509_extensions = v3_ext
[ dn ]
CN = $KEY_LABEL
[ v3_ext ]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
EOF
    KEY="$KEYCHAIN_DIR/key.pem"
    CRT="$KEYCHAIN_DIR/cert.pem"
    P12="$KEYCHAIN_DIR/cert.p12"
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
      -keyout "$KEY" -out "$CRT" -config "$CONF" >/dev/null 2>&1
    openssl pkcs12 -export -inkey "$KEY" -in "$CRT" \
      -out "$P12" -name "$KEY_LABEL" -passout "pass:$PW" >/dev/null 2>&1
    security import "$P12" -k "$KEYCHAIN" -P "$PW" \
      -T /usr/bin/codesign -T /usr/bin/security >/dev/null 2>&1 || true
    # Allow codesign to use the key non-interactively from now on.
    security set-key-partition-list -S apple-tool:,apple: -s -k "$PW" "$KEYCHAIN" >/dev/null 2>&1 || true
    rm -f "$KEY" "$CRT" "$P12" "$CONF"
  fi

  sign_identity="$(identity_hash)"
fi

# Skip re-signing if the binary's existing signature already matches the
# persistent identity (keeps the CDHash stable across runs).
current_authority="$(codesign -dvv "$APP" 2>&1 | awk -F'=' '/^Authority/ {print $2; exit}' || true)"

if [ -n "$sign_identity" ] && [ "$current_authority" != "$KEY_LABEL" ]; then
  # codesign(1) only sees identities in keychains on the search list. Add ours
  # temporarily, sign by SHA-1 hash (stable across renames), then restore.
  ORIG_LIST="$(security list-keychains -d user | tr -d '"' | xargs)"
  if ! printf '%s\n' "$ORIG_LIST" | tr ' ' '\n' | grep -qx "$KEYCHAIN"; then
    # shellcheck disable=SC2086
    security list-keychains -d user -s $ORIG_LIST "$KEYCHAIN" >/dev/null
    RESTORE_LIST=1
  else
    RESTORE_LIST=0
  fi

  if ! codesign -s "$sign_identity" --force --deep "$APP" 2>/dev/null; then
    # Persistent identity failed (cert evicted, keychain corrupted, etc.).
    # Fall back to ad-hoc so the binary at least loads — TCC will need re-grant.
    codesign -s - --force --deep "$APP" 2>/dev/null || true
  fi

  if [ "$RESTORE_LIST" -eq 1 ]; then
    # shellcheck disable=SC2086
    security list-keychains -d user -s $ORIG_LIST >/dev/null
  fi
elif [ "$needs_rebuild" -eq 1 ] && [ -z "$sign_identity" ]; then
  # No persistent identity available; fall back to ad-hoc.
  codesign -s - --force --deep "$APP" 2>/dev/null || true
fi

echo "Built $APP"
