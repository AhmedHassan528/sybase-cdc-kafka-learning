#!/usr/bin/env bash
# Insert, update and delete a few rows in the source database.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ase_app < "$LAB_ENV_DIR/changes.sql"
