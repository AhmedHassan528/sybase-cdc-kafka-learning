#!/usr/bin/env bash
# Run a command and save its output as evidence. Usage: capture-evidence.sh <docs/evidence/NN-name.txt> <command> [args...]
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
out=$1; shift
mkdir -p "$(dirname "$out")"
{
  echo "# Captured: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Command:  $*"
  echo "# Images:   $(docker ps --format '{{.Names}}={{.Image}}' | grep '^cdc-lab-' | tr '\n' ' ')"
  echo
  "$@" 2>&1
  rc=$?
  echo
  echo "# exit code: $rc"
  exit $rc
} | tee "$out"
exit ${PIPESTATUS[0]}
