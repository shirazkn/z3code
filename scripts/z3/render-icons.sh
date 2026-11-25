#!/usr/bin/env bash
# Renders every z3code icon from assets/z3/app-icon.svg (-light.svg for the light Dock icon,
# -small.svg for 32 px and below).
# Needs ImageMagick with librsvg.
set -euo pipefail
cd "$(dirname "$0")/../../assets/z3"

png() { magick -background none "$1" -resize "$2x$2" -depth 8 "$3"; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

png app-icon.svg 1024 z3code-universal-1024.png
# The macOS tile is 824 px in a 1024 px canvas, over a soft shadow.
png app-icon.svg 824 "$tmp/tile.png"
magick -size 1024x1024 xc:none \
  \( "$tmp/tile.png" -background black -shadow 30x14+0+0 \) -gravity center -geometry +0+10 -composite \
  "$tmp/tile.png" -geometry +0+0 -composite -depth 8 z3code-macos-1024.png
# The Dock icons the desktop app sets at run time, by appearance (apps/desktop/src/z3/dockIcon.ts).
dock() {
  png "$1" 824 "$tmp/dock.png"
  magick -size 1024x1024 xc:none \
    \( "$tmp/dock.png" -background black -shadow 30x14+0+0 \) -gravity center -geometry +0+10 -composite \
    "$tmp/dock.png" -geometry +0+0 -composite -resize 512x512 -depth 8 "$2"
}
dock app-icon.svg ../../apps/desktop/resources/z3-dock-dark.png
dock app-icon-light.svg ../../apps/desktop/resources/z3-dock-light.png
png app-icon-small.svg 16 z3code-web-favicon-16x16.png
png app-icon-small.svg 32 z3code-web-favicon-32x32.png
png app-icon.svg 180 z3code-web-apple-touch-180.png
png app-icon.svg 192 z3code-web-icon-192x192.png
png app-icon.svg 512 z3code-web-icon-512x512.png
for size in 16 24 32; do png app-icon-small.svg "$size" "$tmp/$size.png"; done
for size in 48 64 128 256; do png app-icon.svg "$size" "$tmp/$size.png"; done
magick "$tmp"/{16,32,48}.png z3code-web-favicon.ico
magick "$tmp"/{16,24,32,48,64,128,256}.png z3code-windows.ico
