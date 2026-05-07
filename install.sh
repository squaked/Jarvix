#!/bin/bash
set -euo pipefail

echo "🤖 Installing Jarvix..."

if ! command -v node &> /dev/null; then
  echo "📦 Node.js not found. Installing via Homebrew..."
  if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install node
fi

# Prefer JARVIX_*; still honor JARVIS_* so older docs / muscle memory keep working.
INSTALL_DIR="${JARVIX_INSTALL_DIR:-${JARVIS_INSTALL_DIR:-$HOME/.jarvix-app}}"
REPO_URL="${JARVIX_REPO_URL:-${JARVIS_REPO_URL:-https://github.com/YOUR_USERNAME/jarvix.git}}"

if [ -d "$INSTALL_DIR" ]; then
  echo "🔄 Updating Jarvix..."
  (cd "$INSTALL_DIR" && git pull)
else
  echo "📥 Cloning Jarvix..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm install --silent
npm run build --silent

npm start &
sleep 3
open "http://localhost:3000" 2>/dev/null || true

echo "✅ Jarvix is running at http://localhost:3000"
