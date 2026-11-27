#!/usr/bin/env bash
# Remove build output and the arduino-cli build cache
set -euo pipefail
source "$(dirname "$0")/env.sh"
rm -rf "$BUILD_DIR"
command -v arduino-cli >/dev/null 2>&1 && arduino-cli cache clean || true
echo "Cleaned"
