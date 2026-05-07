#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/JarvixEventKitHelper.app"
BIN="$APP/Contents/MacOS"
mkdir -p "$BIN"
cp "$ROOT/Info.plist" "$APP/Contents/Info.plist"
swiftc -O -whole-module-optimization -o "$BIN/JarvixEventKitHelper" "$ROOT/main.swift"
chmod +x "$BIN/JarvixEventKitHelper"

if command -v codesign >/dev/null 2>&1; then
  codesign -s - --force --deep "$APP" 2>/dev/null || true
fi

echo "Built $APP"
