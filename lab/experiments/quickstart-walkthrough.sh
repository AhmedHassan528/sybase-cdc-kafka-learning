#!/usr/bin/env bash
# Walks through the 11 scenarios of specs/001-cdc-learning-project/quickstart.md from a reset lab and prints one result line each.
# Scenario 3 runs the unit checkpoints of all six increments (starter must fail, solution must pass); the live checks of the
# increments are run by lab/experiments/verify-all-increments.sh (evidence 35) and are not repeated here.
# Scenario 11 resets the lab again at the end (it runs the PowerShell path), so it comes last.
# Takes about 30 minutes. Bash only; on Windows run it in Git Bash. Exit code 1 if any scenario fails.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVD="$HERE/../env"; INC="$HERE/../increments"
source "$ENVD/_common.sh"
cd "$LAB_ROOT"
fails=0; t0=$(date +%s)
result() { printf '%-4s %-46s %s\n' "$1" "$2" "$3"; [[ "$3" == PASS* ]] || fails=$((fails + 1)); }
events() { TOPIC=sybase.phoenix_test.payment bash "$ENVD/consume.sh" sybase.phoenix_test.payment 8000 | grep -oE '"op":"[cud]"' | tr '\n' ' '; }

echo "== scenarios 1, 2 and 6: environment, first event, reset and repeat"
bash "$HERE/section2-dry-run.sh" > /tmp/qs-run1.log 2>&1; rc1=$?
ev1=$(events)
bash "$HERE/section2-dry-run.sh" > /tmp/qs-run2.log 2>&1; rc2=$?     # this resets the lab first, then repeats scenario 2
ev2=$(events)
up=$(docker ps --format '{{.Names}} {{.Status}}' | grep -c '^cdc-lab-')
result 1 "environment: four containers up, Connect answers" "$( [ "$up" -eq 4 ] && curl -fsS "$CONNECT_URL/connectors" >/dev/null 2>&1 && echo PASS || echo "FAIL ($up containers)")"
result 2 "first event: c c u d for the scripted changes" "$( [ "$rc1" -eq 0 ] && [ "$ev1" = '"op":"c" "op":"c" "op":"u" "op":"d" ' ] && echo "PASS ($ev1)" || echo "FAIL (rc=$rc1, events: $ev1)")"
result 6 "reset, then scenario 2 again: same result" "$( [ "$rc2" -eq 0 ] && [ "$ev2" = "$ev1" ] && echo PASS || echo "FAIL (rc=$rc2, events: $ev2)")"

echo "== scenario 3: the six increments, unit checkpoints"
s3=PASS
for i in 01-listener 02-ltl-parser 03-transaction-buffer 04-connect-records 05-acks-and-offsets 06-package-and-run; do
  bash "$INC/$i/verify.sh" solution >/tmp/qs-s.log 2>&1; a=$?
  bash "$INC/$i/verify.sh" starter  >/tmp/qs-t.log 2>&1; b=$?
  [ "$a" -eq 0 ] && [ "$b" -ne 0 ] || s3="FAIL ($i: solution exit $a, starter exit $b)"
done
result 3 "increments: solutions pass, starters fail" "$s3"

echo "== scenario 4: restart the connector while writing (no row lost)"
out=$(bash "$HERE/restart-connector.sh" 2>&1)
rows=$(grep -oE 'distinct rows by account_no: [0-9]+' <<<"$out" | grep -oE '[0-9]+$')
result 4 "restart mid-stream: 30 of 30 rows delivered" "$( [ "$rows" = 30 ] && echo "PASS ($(grep -E 'duplicated events' <<<"$out" | tr -s ' '))" || echo "FAIL (rows delivered: ${rows:-?})")"

echo "== scenario 5: rolled-back transaction"
out=$(bash "$HERE/rollback.sh" 2>&1)
result 5 "rollback: no event for the rolled-back row" "$( grep -q 'events for the rolled-back row: 0' <<<"$out" && grep -q 'COMMITTED' <<<"$out" && echo PASS || echo "FAIL")"

echo "== scenario 7: article build and link check"
REPO="$(cd "$HERE/../.." && pwd)"
b=$(cd "$REPO" && node docs-src/build.js article 2>&1 | tail -n 1); l=$(cd "$REPO" && node docs-src/linkcheck.js docs "$(cygpath -m /tmp)/qs-links.txt" 2>&1 | tail -n 1)
result 7 "article builds, links resolve (problems=0)" "$( grep -q 'problems=0' <<<"$l" && echo "PASS ($l)" || echo "FAIL ($l)")"

echo "== scenario 8: secret scan"
bash "$ENVD/secret-scan.sh" >/tmp/qs-s8.log 2>&1; result 8 "secret scan" "$( [ $? -eq 0 ] && echo PASS || echo FAIL)"
echo "== scenario 9: image pins"
bash "$ENVD/verify-images.sh" >/tmp/qs-s9.log 2>&1; result 9 "image pins" "$( [ $? -eq 0 ] && echo PASS || echo FAIL)"
echo "== scenario 10: lab security"
bash "$ENVD/verify-security.sh" >/tmp/qs-s10.log 2>&1; rc=$?; result 10 "lab security ($(grep RESULT /tmp/qs-s10.log))" "$( [ $rc -eq 0 ] && echo PASS || echo FAIL)"
echo "== scenario 11: PowerShell scripts (resets the lab)"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$HERE/powershell-path.ps1")" >/tmp/qs-s11.log 2>&1; rc=$?
result 11 "PowerShell path ($(grep -E '^RESULT' /tmp/qs-s11.log))" "$( [ $rc -eq 0 ] && echo PASS || echo FAIL)"

echo
echo "SUMMARY: 11 scenarios, $fails failed, $(( $(date +%s) - t0 )) s"
[ "$fails" -eq 0 ]
