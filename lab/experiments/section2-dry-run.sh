#!/usr/bin/env bash
# Follows "Try it at home" exactly as written, from a clean lab, and prints each step's output.
# Use it to check that the article still matches reality. Takes a few minutes (ASE first-boot init).
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
step() { echo; echo "=== $*"; }
t0=$(date +%s)

step "reset"
"$LAB_ENV_DIR/reset.sh"
step "Step 1: start.sh"
"$LAB_ENV_DIR/start.sh"
echo "-- docker ps:"; docker ps --format '{{.Names}}\t{{.Status}}' | grep '^cdc-lab-'
step "Step 2: register-connector.sh"
"$LAB_ENV_DIR/register-connector.sh"
step "Step 3: changes.sh"
"$LAB_ENV_DIR/changes.sh"
step "Step 4: consume.sh (waiting for the 4 events)"
"$LAB_ENV_DIR/await-event.sh" sybase.phoenix_test.payment '"op":"d"' 180 >/dev/null
"$LAB_ENV_DIR/consume.sh" | sed -E 's/"source":\{[^}]*\},//'
echo
echo "total: $(( $(date +%s) - t0 )) s from reset to last event"
