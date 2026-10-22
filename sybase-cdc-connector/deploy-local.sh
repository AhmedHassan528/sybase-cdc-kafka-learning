#!/usr/bin/env bash
# Build, copy the JAR to ../plugins, restart the local Connect worker and wait for the connector.
set -euo pipefail
cd "$(dirname "$0")"
./build.sh "$@"
docker restart cdc-connect >/dev/null
for i in $(seq 1 60); do
  s=$(curl -s localhost:8083/connectors/sybase-cdc-phoenix/status 2>/dev/null || true)
  echo "$s" | grep -q '"tasks":\[{"id":0,"state":"RUNNING"' && { echo "connector RUNNING"; exit 0; }
  sleep 3
done
echo "connector not running: $s"; exit 1
