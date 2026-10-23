#!/usr/bin/env bash
# Shows what Docker says when a published port is already in use, with two throwaway containers on a spare port (18083).
# The lab itself is not touched. Used by lesson 2.2 of the learning path.
set -uo pipefail
IMG=apache/kafka:3.8.0
cleanup() { docker rm -f cdc-path-port-demo-1 >/dev/null 2>&1; }
trap cleanup EXIT
docker run -d --name cdc-path-port-demo-1 -p 127.0.0.1:18083:80 --entrypoint sleep "$IMG" 60 >/dev/null || exit 1
echo "the first container holds port 18083"
docker run --rm --name cdc-path-port-demo-2 -p 127.0.0.1:18083:80 --entrypoint sleep "$IMG" 1 2>&1 | head -n 3
echo "exit code of the second container: ${PIPESTATUS[0]}"
