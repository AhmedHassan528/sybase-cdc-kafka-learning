#!/usr/bin/env bash
# The change step of the end-to-end demonstration: insert, update and delete one row of payment as the lab's app account.
# Usage: lab/path/demo/change-records.sh [tag]      (tag: the account_no of the row; default PATH-DEMO; use a new tag to repeat)
# Each statement is its own transaction, so the connector publishes three events: c (insert), u (update), d (delete).
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../../env/_common.sh"
TAG=${1:-PATH-DEMO}
[[ "$TAG" =~ ^[A-Za-z0-9-]{1,30}$ ]] || { echo "tag: letters, digits and - only, at most 30 characters" >&2; exit 2; }
run() { echo "> $1"; printf '%s\ngo\n' "$1" | ase_app; }
run "insert into payment (account_no, amount, currency) values ('$TAG', 10.00, 'EUR')"
run "update payment set amount = 25.50 where account_no = '$TAG'"
run "delete from payment where account_no = '$TAG'"
