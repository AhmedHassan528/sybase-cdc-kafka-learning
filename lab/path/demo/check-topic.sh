#!/usr/bin/env bash
# The check step of the end-to-end demonstration: wait until the topic holds the three events of the demonstration row
# (insert, update, delete) and verify their operations, key and amounts. Exit 0 = PASS, 1 = FAIL or timeout.
# Usage: lab/path/demo/check-topic.sh [tag] [timeout-seconds]      (tag as in change-records.sh; default PATH-DEMO, 90 s)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../../env/_common.sh"
TAG=${1:-PATH-DEMO}; LIMIT=${2:-90}
[[ "$TAG" =~ ^[A-Za-z0-9-]{1,30}$ && "$LIMIT" =~ ^[0-9]+$ ]] || { echo "invalid tag or timeout" >&2; exit 2; }
t=0
while :; do
  out=$("$LAB_ENV_DIR/consume.sh" "$TOPIC" 5000 | node "$LAB_ENV_DIR/../path/demo/check-topic.js" "$TAG" "$TOPIC")
  rc=$?
  if [ $rc -eq 0 ] || [ $t -ge "$LIMIT" ]; then echo "$out"; [ $rc -ne 0 ] && echo "gave up after ${t}s"; exit $rc; fi
  t=$((t + 8)); sleep 3
done
