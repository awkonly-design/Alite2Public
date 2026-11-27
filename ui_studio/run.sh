#!/usr/bin/env bash
# Start Alite2 Studio and open it in the browser.
#   ./run.sh          start (or just open the page if already running)
#   ./run.sh claude   start Claude Code in the repository with the Alite2 Studio tools (MCP) connected
#   ./run.sh codex    the same with the Codex CLI
#   ./run.sh stop     stop the server listening on the port
set -euo pipefail

cd "$(dirname "$0")"
PORT="${ALITE2_UI_PORT:-5190}"
URL="http://127.0.0.1:$PORT"

if [ "${1:-}" = "stop" ]; then
  PIDS="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN || true)"
  if [ -z "$PIDS" ]; then
    echo "Alite2 Studio is not running on port $PORT"
    exit 0
  fi
  echo "Stopping Alite2 Studio (pid $PIDS)"
  echo "Note: if an AI assistant session started this server, its Alite2 Studio tools stop working until that session restarts."
  kill $PIDS
  exit 0
elif [ -n "${1:-}" ] && [ "$1" != "claude" ] && [ "$1" != "codex" ]; then
  echo "Usage: $0 [claude | codex | stop]" >&2
  exit 1
fi
AI="${1:-}"

open_browser() {
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
  else echo "Open $URL in your browser."
  fi
}

# With an AI assistant: its MCP server (mcp/server.js) serves the editor itself, or connects to the one already
# running; open the page once it answers and run the assistant in the repository root (where .mcp.json is).
if [ -n "$AI" ]; then
  command -v "$AI" >/dev/null 2>&1 || { echo "$AI is not installed (see README.md, AI assistants)" >&2; exit 1; }
  [ -d node_modules ] || npm install
  STUDIO="$(pwd)"
  (
    for _ in $(seq 1 300); do
      if curl -fs -o /dev/null "$URL"; then open_browser; exit 0; fi
      sleep 0.2
    done
    echo "Alite2 Studio did not answer at $URL: check /mcp in the assistant" >&2
  ) &
  cd ..
  echo "Starting $AI with the Alite2 Studio tools; the editor opens at $URL"
  if [ "$AI" = "claude" ]; then
    exec claude    # .mcp.json registers alite2-ui, .claude/settings.json enables it
  else
    exec codex -c 'mcp_servers.alite2-ui.command="node"' -c "mcp_servers.alite2-ui.args=[\"$STUDIO/mcp/server.js\"]"
  fi
fi

# Already running (npm start or an AI assistant session): just open the page.
if curl -fs -o /dev/null "$URL"; then
  echo "Alite2 Studio is already running at $URL"
  open_browser
  exit 0
fi

[ -d node_modules ] || npm install

# Open the browser once the server answers.
(
  for _ in $(seq 1 50); do
    if curl -fs -o /dev/null "$URL"; then open_browser; exit 0; fi
    sleep 0.2
  done
  echo "Server did not answer at $URL" >&2
) &

echo "Starting Alite2 Studio at $URL (Ctrl+C to stop)"
exec npm start
