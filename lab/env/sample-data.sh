#!/usr/bin/env bash
# Create the second sample table (customer) and mark it for replication.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ase_sql < "$LAB_ENV_DIR/sample-data.sql"
