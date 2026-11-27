#!/usr/bin/env bash
# Flash over USB.   ./scripts/upload.sh [serial-port]
set -euo pipefail
source "$(dirname "$0")/env.sh"
need_cli
PORT="${1:-}"
if [ -z "$PORT" ]; then
  PORT=$(arduino-cli board list | awk '/serial/ && /(ESP32|usbmodem|ttyACM|ttyUSB)/ {print $1; exit}')
  [ -n "$PORT" ] || { echo "No board found. Usage: $0 <port>"; arduino-cli board list; exit 1; }
fi
[ -f "$BIN" ] || "$(dirname "$0")/build.sh"
echo "Uploading to $PORT"
arduino-cli upload -p "$PORT" --fqbn "$FQBN" --input-dir "$BUILD_DIR" "$SKETCH_DIR"
