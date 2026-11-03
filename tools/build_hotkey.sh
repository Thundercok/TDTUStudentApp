#!/bin/zsh
# Developer build only. Distributed Agent apps already include this binary.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="${1:-$ROOT/offline_agent/bin/agent-hotkey}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT/.venv/bin/python}"
BUILD_ID="$(cd "$ROOT" && "$PYTHON_BIN" -c 'from offline_agent.engine.version import BUILD; print(BUILD)')"
mkdir -p "$(dirname "$OUTPUT")"
xcrun clang -arch arm64 -mmacosx-version-min=14.0 -framework Carbon \
  -DOFFLINE_AGENT_BUILD_ID="\"$BUILD_ID\"" -Wno-deprecated-declarations "$ROOT/tools/agent_hotkey.c" -o "$OUTPUT"
