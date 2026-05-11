#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/usr/sbin:/bin:/sbin"
/usr/bin/curl -s --max-time 3 -X POST http://localhost:3000/api/quit >/dev/null 2>&1 || true
sleep 1
PID="$(/usr/sbin/lsof -ti:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
[ -n "$PID" ] && kill "$PID" 2>/dev/null || true
