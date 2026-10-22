#!/usr/bin/env bash
# Renders docs/diagrams/src/*.drawio to docs/diagrams/src/svg/*.svg with headless draw.io (Docker).
set -euo pipefail
D="$(cd "$(dirname "$0")/../../docs/diagrams" && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm -v "$D:/data" rlespinasse/drawio-export:v4.38.0 --format svg --output svg --remove-page-suffix --border 10 src
node "$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))/postprocess.js"
