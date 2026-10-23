#!/usr/bin/env bash
# Run SQL against the lab ASE as one of the lab accounts, without putting a password in a lesson step.
# Usage: lab/path/ase.sh <admin|app|sa> "<sql>"      e.g.  lab/path/ase.sh admin "sp_help_rep_agent phoenix_test"
#   admin = cdc_admin (replication_role only)    app = cdc_app (DML on the sample tables)    sa = setup account (one-time setup only)
# The two lab account passwords are generated per lab into lab/env/.lab-secrets (git-ignored); sa is the public image default.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
who=${1:?usage: ase.sh <admin|app|sa> "<sql>"}; sql=${2:?usage: ase.sh <admin|app|sa> "<sql>"}
case "$who" in
  admin) fn=ase_admin ;;
  app)   fn=ase_app ;;
  sa)    fn=ase_sql ;;
  *) echo "account must be admin, app or sa" >&2; exit 2 ;;
esac
printf '%s\ngo\n' "$sql" | $fn
