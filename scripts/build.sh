#!/usr/bin/env bash
# Compile the firmware into build/
set -euo pipefail
source "$(dirname "$0")/env.sh"
need_cli
arduino-cli compile --fqbn "$FQBN" \
  --build-property "build.partitions_file=partitions.csv" \
  --libraries "$ROOT/src/libraries" \
  --output-dir "$BUILD_DIR" "$@" "$SKETCH_DIR"
echo "OK: $BIN"
