#!/usr/bin/env bash
# Copy olo-mono workflow JSON (recursive, including subfolders) for Docker builds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/olo-be/docker/runtime-configuration"

WORKFLOW_SRC=""
for candidate in \
  "$ROOT/olo-mono/olo-definition/olo-configuration/current-active" \
  "$ROOT/olo-mono/olo-definition/olo-configuration/default"; do
  if [ -d "$candidate" ] && [ -n "$(find "$candidate" -name '*.json' -print -quit)" ]; then
    WORKFLOW_SRC="$candidate"
    break
  fi
done
if [ -z "$WORKFLOW_SRC" ]; then
  echo "Missing workflow source. Expected olo-mono/olo-definition/olo-configuration/current-active or .../default" >&2
  exit 1
fi

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -delete 2>/dev/null || true
cp -r "$WORKFLOW_SRC"/. "$DEST/"
count="$(find "$DEST" -name '*.json' | wc -l | tr -d ' ')"
if [ "$count" = "0" ]; then
  echo "No workflow JSON files copied from $WORKFLOW_SRC" >&2
  exit 1
fi
echo "Bundled $count workflow preset(s) from $WORKFLOW_SRC into $DEST"
