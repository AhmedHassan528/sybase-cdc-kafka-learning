#!/usr/bin/env bash
# Tells whether TCP ports on this machine are free (nothing accepts a connection on 127.0.0.1) or in use.
# Usage: lab/path/check-ports.sh 5000 8080 8083 29092
set -uo pipefail
for p in "$@"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then echo "port $p: in use"; else echo "port $p: free"; fi
done
