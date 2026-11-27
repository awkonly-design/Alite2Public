#!/usr/bin/env bash
# Flash over WiFi (ArduinoOTA).   ./scripts/upload_ota.sh <device-ip> <ota-password>
#                                 OTA_PASSWORD=<ota-password> ./scripts/upload_ota.sh <device-ip>
# The light must be in WiFi mode (Art-Net / sACN) and connected. Its IP address and its 8-character OTA password
# are shown on its LCD: Setup > Radio page, at the bottom (password under the IP address; it changes with the IP).
# Alite2Public needs light firmware 1.2.6 or later; HDS-15W lights (older factory firmware) must be updated first.
# Port: OTA_PORT in src/Alite2/config.h (default 3232).
set -euo pipefail
source "$(dirname "$0")/env.sh"
IP="${1:-}"
PASS="${2:-${OTA_PASSWORD:-}}"
usage() { echo "Usage: $0 <device-ip> <ota-password>   (or OTA_PASSWORD=<ota-password> $0 <device-ip>)"; }
[ -n "$IP" ] || { usage; exit 1; }
[ -n "$PASS" ] || { usage; echo "Enter the 8-character OTA password shown on the light's LCD (Setup > Radio, at the bottom under the IP address)."; exit 1; }
# 8-character on-screen passwords are upper-case (typed case-insensitively)
PASS="$(printf '%s' "$PASS" | tr '[:lower:]' '[:upper:]')"
printf '%s' "$PASS" | grep -Eq '^[A-HJ-NP-Z2-9]{8}$' || { echo "Invalid OTA password: 8 characters (A-Z without I/O, 2-9) shown on the light's LCD (Setup > Radio, under the IP address)."; echo "HDS-15W lights (factory firmware below 1.2.6) cannot be updated: update them to 1.2.6 or later first."; exit 1; }
cfg() { sed -n "s/^#define $1[[:space:]]*\"\{0,1\}\([^\"]*\)\"\{0,1\}.*/\1/p" "$SKETCH_DIR/config.h" | head -1; }
OPORT="$(cfg OTA_PORT)"; OPORT="${OPORT:-3232}"
[ -f "$BIN" ] || "$(dirname "$0")/build.sh"
ESPOTA="$(find "$HOME/Library/Arduino15" "$HOME/.arduino15" "${LOCALAPPDATA:-}/Arduino15" -path "*esp32/hardware/esp32/$ESP32_CORE_VERSION/tools/espota.py" 2>/dev/null | head -1 || true)"
[ -n "$ESPOTA" ] || { echo "espota.py not found (run ./scripts/setup.sh)"; exit 1; }
python3 "$ESPOTA" -i "$IP" -p "$OPORT" -a "$PASS" -f "$BIN" -r
