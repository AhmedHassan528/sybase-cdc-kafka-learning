#!/usr/bin/env bash
# Runs the four checks of every build-along increment and compares each with what it must do:
#   starter  unit checkpoints  -> must FAIL   (the exercise is not done yet)
#   solution unit checkpoints  -> must PASS
#   starter  live check        -> must FAIL
#   solution live check        -> must PASS
# Prints one line per check and a summary; exit code 1 if anything came out differently from what it must do.
# Needs the lab running with the connector registered. Takes about half an hour (the live checks stop the connector
# and run their own listener or worker for a minute or two each). Bash only; on Windows run it in Git Bash.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INC="$HERE/../increments"
incs="01-listener 02-ltl-parser 03-transaction-buffer 04-connect-records 05-acks-and-offsets 06-package-and-run"
unexpected=0; total=0
t0=$(date +%s)

check() {   # check <label> <must: PASS|FAIL> <command...>
  local label=$1 must=$2; shift 2
  local out rc got
  out=$("$@" 2>&1); rc=$?
  got=FAIL; [ $rc -eq 0 ] && got=PASS
  total=$((total + 1))
  local verdict="as required"
  [ "$got" = "$must" ] || { verdict="UNEXPECTED"; unexpected=$((unexpected + 1)); }
  printf '%-34s must %-4s got %-4s  %s\n' "$label" "$must" "$got" "$verdict"
  grep -E '^(PASS|FAIL) ' <<<"$out" | tail -n 1 | cut -c1-200 | sed 's/^/      /'
}

for i in $incs; do
  echo "== increment $i"
  check "$i starter  unit tests"  FAIL "$INC/$i/verify.sh" starter
  check "$i solution unit tests"  PASS "$INC/$i/verify.sh" solution
  check "$i starter  live check"  FAIL "$INC/$i/verify-live.sh" starter
  check "$i solution live check"  PASS "$INC/$i/verify-live.sh" solution
done
echo
echo "SUMMARY: $total checks run in $(( $(date +%s) - t0 )) s, $unexpected came out differently from what they must do"
[ "$unexpected" -eq 0 ]
