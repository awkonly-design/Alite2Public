#!/usr/bin/env bash
# One-time setup: ESP32 core, libraries (pinned versions) and lv_conf.h.
set -euo pipefail
source "$(dirname "$0")/env.sh"
need_cli

ESP32_URL="https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"
arduino-cli config init >/dev/null 2>&1 || true
arduino-cli config add board_manager.additional_urls "$ESP32_URL" >/dev/null 2>&1 || true
arduino-cli core update-index
arduino-cli core install "esp32:esp32@$ESP32_CORE_VERSION"

LIBS=(
  "lvgl@8.3.11"
  "GFX Library for Arduino@1.4.7"
  "Adafruit NeoPixel@1.12.2"
  "Adafruit TLC59711@1.3.4"
  "Adafruit BusIO@1.15.0"
  "ArtNet@0.8.0"
  "CRC@1.0.3"
  "ESP32Encoder@0.11.8"
  "ESP32Time@2.0.6"
  "NTPClient@3.2.1"
)
for lib in "${LIBS[@]}"; do arduino-cli lib install "$lib"; done

# LVGL looks for lv_conf.h next to the lvgl library folder
LIBDIR="$(arduino-cli config get directories.user 2>/dev/null || echo "$HOME/Documents/Arduino")/libraries"
if [ -f "$LIBDIR/lv_conf.h" ] && ! cmp -s "$ROOT/src/lv_conf.h" "$LIBDIR/lv_conf.h"; then
  cp "$LIBDIR/lv_conf.h" "$LIBDIR/lv_conf.h.bak"
  echo "Existing lv_conf.h saved as $LIBDIR/lv_conf.h.bak"
fi
cp "$ROOT/src/lv_conf.h" "$LIBDIR/lv_conf.h"
echo "Installed lv_conf.h to $LIBDIR"
echo "Setup done. Next: ./scripts/build.sh"
