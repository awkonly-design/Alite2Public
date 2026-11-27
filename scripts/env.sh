# Shared settings for the build scripts (sourced, not executed).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKETCH_DIR="$ROOT/src/Alite2"
BUILD_DIR="$ROOT/build"
ESP32_CORE_VERSION="3.0.2"
FQBN="esp32:esp32:esp32s3:FlashSize=16M,CPUFreq=240,DebugLevel=none,FlashMode=qio,PSRAM=disabled,PartitionScheme=custom"
BIN="$BUILD_DIR/Alite2.ino.bin"

need_cli() {
  if ! command -v arduino-cli >/dev/null 2>&1; then
    echo "arduino-cli not found. Install it first: https://arduino.github.io/arduino-cli/latest/installation/" >&2
    echo "  macOS: brew install arduino-cli" >&2
    exit 1
  fi
}
