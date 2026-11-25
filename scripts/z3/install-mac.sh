#!/usr/bin/env bash
# Builds z3code.app for Apple silicon from this checkout and installs it in /Applications.
# Needs Node 26, pnpm 12 and Rust (`brew install node pnpm rustup && rustup default stable`).
set -euo pipefail
cd "$(dirname "$0")/../.."

rustup target add aarch64-apple-darwin
pnpm install --frozen-lockfile
out="$(mktemp -d)"
# No update repository: the fork has no auto-update feed.
env -u GITHUB_REPOSITORY -u T3CODE_DESKTOP_UPDATE_REPOSITORY \
  pnpm exec node scripts/build-desktop-artifact.ts \
  --platform mac --target dir --arch arm64 --build-version 0.1.11 --output-dir "$out"

app="$(find "$out" -maxdepth 3 -name 'z3code.app' -type d | head -n 1)"
if [[ -z "$app" ]]; then
  echo "No z3code.app under $out:" >&2
  ls -R "$out" | head -n 40 >&2
  exit 1
fi
osascript -e 'quit app "z3code"' 2>/dev/null || true
rm -rf /Applications/z3code.app
cp -R "$app" /Applications/z3code.app
# Ad-hoc signature: the build has no Apple developer identity.
codesign --force --deep --sign - /Applications/z3code.app
# macOS caches an app's icon by path; a new modification time and a fresh registration drop it.
touch /Applications/z3code.app
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f /Applications/z3code.app
open /Applications/z3code.app
