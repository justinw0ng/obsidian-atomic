#!/usr/bin/env bash
# Capture the daily note, then place it in the same desktop + phone chrome
# as the dashboard and cue heroes.
set -euo pipefail

export DISPLAY=:1
SHOT_DIR="/tmp/atomic-hero-shots"
DESKTOP_SHOT="${SHOT_DIR}/desktop.png"
MOBILE_SHOT="${SHOT_DIR}/mobile.png"
OUT="/workspace/docs/images/atomic-daily-hero.png"
GIF_OUT="/workspace/docs/images/atomic-daily-hero.gif"

if pgrep -x obsidian >/dev/null 2>&1; then
  echo "ERROR: Obsidian is already running. Close it before capturing." >&2
  pgrep -x obsidian >&2
  exit 1
fi

node /workspace/scripts/capture-daily-hero.mjs

FRAMED_DIR="${SHOT_DIR}/framed"
mkdir -p "$FRAMED_DIR"
python3 /workspace/scripts/frame-hero-content.py \
  --scene daily \
  --kind desktop \
  --content "$DESKTOP_SHOT" \
  --out "${FRAMED_DIR}/desktop.png"
python3 /workspace/scripts/frame-hero-content.py \
  --scene daily \
  --kind phone \
  --content "$MOBILE_SHOT" \
  --out "${FRAMED_DIR}/phone.png"
python3 /workspace/scripts/compose-device-hero.py \
  --preframed \
  --desktop "${FRAMED_DIR}/desktop.png" \
  --mobile "${FRAMED_DIR}/phone.png" \
  --out "$OUT"

echo "Saved $OUT ($(wc -c < "$OUT") bytes)"

python3 /workspace/scripts/animate-hero-gif.py \
  --hero "$OUT" \
  --out "$GIF_OUT"
echo "Saved $GIF_OUT ($(wc -c < "$GIF_OUT") bytes)"
