#!/usr/bin/env bash
# Copy olo-mono current-active workflow JSON (including subfolders) for Docker builds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/olo-mono/olo-definition/olo-configuration/current-active"
DEST="$ROOT/olo-be/docker/runtime-configuration"

if [ ! -d "$SRC" ]; then
  echo "Missing workflow source: $SRC" >&2
  echo "Checkout olo-mono beside olo-ui or set SRC manually." >&2
  exit 1
fi

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -delete 2>/dev/null || true
cp -r "$SRC"/. "$DEST/"
count="$(find "$DEST" -name '*.json' | wc -l | tr -d ' ')"
if [ "$count" = "0" ]; then
  echo "No workflow JSON files copied from $SRC" >&2
  exit 1
fi
echo "Bundled $count workflow preset(s) into $DEST"
