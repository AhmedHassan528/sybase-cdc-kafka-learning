#!/usr/bin/env bash
# Repeatability: run each lab script twice in a row and compare the second run with the first.
#
# EXPECTED (written before the first run): scripts that set something up or check something (start, register-connector,
# create-accounts, sample-data, set-tables with the same list, verify-security, verify-images, secret-scan,
# audit-article-scripts, checksums verify) give the same exit code twice and the second run reports no error and creates
# no duplicate object. changes.sh is NOT idempotent by design: each run inserts, updates and deletes rows again, so the
# second run succeeds and adds new rows (the table grows).
# Needs a running lab with the connector registered. Takes several minutes (verify-security.sh alone about a minute).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVD="$HERE/../env"
source "$ENVD/_common.sh"
cur=$(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/config" | sed -E 's/.*"table.include.list":"([^"]*)".*/\1/')

run() {   # run <name> <idempotent: yes|no> <command...>
  local name=$1 idem=$2; shift 2
  local out1 rc1 out2 rc2
  out1=$("$@" 2>&1); rc1=$?
  out2=$("$@" 2>&1); rc2=$?
  local err2; err2=$(grep -iE 'error|already exists|duplicate|cannot|failed|Msg [0-9]+, Level 1[1-9]' <<<"$out2" | grep -vciE '(^|[^0-9])0 (failed|duplicate)')
  local verdict
  if [ "$rc1" -ne 0 ] || [ "$rc2" -ne 0 ]; then verdict="FAILED (exit codes $rc1 then $rc2)"
  elif [ "$err2" -gt 0 ] && [ "$idem" = yes ]; then verdict="CHECK: the second run printed $err2 line(s) that look like errors"
  else verdict="ok"; fi
  printf '%-34s exit %s then %s   idempotent by design: %-3s  -> %s\n' "$name" "$rc1" "$rc2" "$idem" "$verdict"
  echo "      last line of run 2: $(tail -n 1 <<<"$out2" | cut -c1-140)"
}
rows() { printf 'select count(*) from payment\ngo\n' | ase_app | grep -E '^ +[0-9]+ *$' | tr -d ' '; }

run "start.sh"                       yes bash "$ENVD/start.sh"
run "register-connector.sh"          yes bash "$ENVD/register-connector.sh"
run "create-accounts.sh"             yes bash "$ENVD/create-accounts.sh"
run "sample-data.sh"                 yes bash "$ENVD/sample-data.sh"
run "set-tables.sh (same list)"      yes bash "$ENVD/set-tables.sh" "$cur"
before=$(rows)
run "changes.sh"                     no  bash "$ENVD/changes.sh"
after=$(rows)
echo "      payment rows before/after two runs of changes.sh: $before / $after (inserts then deletes of the same rows leave the count unchanged by design; each run still wrote events)"
run "verify-security.sh"             yes bash "$ENVD/verify-security.sh"
run "verify-images.sh"               yes bash "$ENVD/verify-images.sh"
run "secret-scan.sh"                 yes bash "$ENVD/secret-scan.sh"
run "audit-article-scripts.sh"       yes bash "$ENVD/audit-article-scripts.sh"
run "checksums.sh verify"            yes bash "$ENVD/checksums.sh" verify
echo "-- connector after all runs: $(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" | grep -o '"state":"[A-Z]*"' | head -n 2 | tr '\n' ' ')"
