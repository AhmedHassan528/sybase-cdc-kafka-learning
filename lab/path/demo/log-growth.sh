#!/usr/bin/env bash
# Counts the records of the transaction log table (syslogs) of phoenix_test, inserts one payment row, and counts again.
# Used by lesson 5.1 of the learning path. The row has the account_no LESSON-5-1 and is replicated like any other change.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../../env/_common.sh"
count() { printf 'select count(*) from syslogs\ngo\n' | ase_admin | grep -E '^ +[0-9]+ *$' | tr -d ' '; }
before=$(count)
printf "insert into payment (account_no, amount, currency) values ('LESSON-5-1', 1.00, 'EUR')\ngo\n" | ase_app > /dev/null
after=$(count)
echo "log records before the insert: $before"
echo "log records after the insert:  $after"
echo "new log records for one insert: $((after - before))"
