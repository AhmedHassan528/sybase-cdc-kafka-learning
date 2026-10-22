#!/usr/bin/env bash
# Regenerates the .drawio files and renders PNG previews (docs-src/diagrams/preview/src/png) for review.
set -euo pipefail
G="$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))"
node "$G/drawio-gen.js" >/dev/null
rm -rf "$G/preview"; mkdir -p "$G/preview/src"; cp "$G/../../docs/diagrams/src/"*.drawio "$G/preview/src/"
P="$(cd "$G/preview" && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm -v "$P:/data" rlespinasse/drawio-export:v4.38.0 --format png --scale 1 --output png --remove-page-suffix --border 10 src >/dev/null 2>&1
ls "$G/preview/src/png" | wc -l
