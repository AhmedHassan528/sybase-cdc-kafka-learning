#!/usr/bin/env bash
# Run the tests of a build-along increment and print one PASS or FAIL line (with the first failing checkpoint).
# Usage: verify-increment.sh <NN-name> [starter|solution]       e.g. verify-increment.sh 01-listener
#   starter  (default) your working copy: lab/increments/<NN-name>/starter
#   solution           the reference solution: lab/solutions/<NN-name>
# Exit code 0 = all checkpoints pass, 1 = a checkpoint fails or the code does not compile, 2 = bad arguments.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
inc=${1:?usage: verify-increment.sh <NN-name> [starter|solution]}; which=${2:-starter}
[[ "$inc" =~ ^[0-9]{2}-[a-z0-9-]+$ ]] || { echo "invalid increment name" >&2; exit 2; }
case "$which" in
  starter)  module="increments/$inc/starter" ;;
  solution) module="solutions/$inc" ;;
  *) echo "second argument must be starter or solution" >&2; exit 2 ;;
esac

out=$("$HERE/mvn.sh" "$module" test 2>&1); rc=$?
if [ $rc -eq 0 ]; then
  n=$(grep -oE 'Tests run: [0-9]+' <<<"$out" | tail -n 1 | grep -oE '[0-9]+')
  echo "PASS  $inc ($which): all $n checkpoints pass"
  exit 0
fi
if grep -q 'COMPILATION ERROR' <<<"$out"; then
  echo "FAIL  $inc ($which): the code does not compile. First error:"
  grep -E '\[ERROR\] .*\.java' <<<"$out" | head -n 1 | sed 's/^/      /'
  exit 1
fi
total=$(grep -oE 'Tests run: [0-9]+' <<<"$out" | tail -n 1 | grep -oE '[0-9]+')
failed=$(grep -cE '^\[ERROR\]   [A-Za-z]+Test\.' <<<"$out")
first=$(grep -E '^\[ERROR\]   [A-Za-z]+Test\.' <<<"$out" | head -n 1 | sed 's/^\[ERROR\]   //')
echo "FAIL  $inc ($which): ${failed:-?} of ${total:-?} checkpoints fail. First failing checkpoint:"
echo "      ${first:-see the Maven output (run lab/env/mvn.sh $module test)}"
exit 1
