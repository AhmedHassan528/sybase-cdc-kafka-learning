#!/usr/bin/env bash
# Live check of increment 1: the real ASE RepAgent connects to YOUR listener.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
# Needs the lab running (lab/env/start.sh) and the connector registered. It stops the connector while it runs and
# resumes it at the end. Passes when the listener's output shows the login being accepted, the connect-source command
# with the right database and LTL version, and a batch of LTL text.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
which=${1:-starter}
case "$which" in
  starter)  module="increments/01-listener/starter" ;;
  solution) module="solutions/01-listener" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc1-build.log 2>&1 || { echo "FAIL  01-listener ($which): the code does not compile"; grep -E '\[ERROR\] .*\.java' /tmp/inc1-build.log | head -n 1 | sed 's/^/      /'; exit 1; }

out=$("$ENV/run-listener-live.sh" "lab/$module/target/cdc-lab-01-listener-0.1.0.jar" com.phoenix.cdc.lab.Increment1Main --wait-for "[inc1] LTL" 2>&1); rc=$?
echo "$out" | sed -n '1,12p'

missing=()
grep -qF "[inc1] login user=rs_user accepted=true" <<<"$out"            || missing+=("RepAgent login accepted (user rs_user)")
grep -qF "[inc1] connect source MYSYBASE.phoenix_test LTL 760" <<<"$out" || missing+=("connect source MYSYBASE.phoenix_test LTL 760")
grep -qF "[inc1] LTL " <<<"$out"                                          || missing+=("a batch of LTL text")
if [ $rc -eq 0 ] && [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  01-listener ($which): the real RepAgent logged in, connected its source and sent LTL to your listener"
  exit 0
fi
echo "FAIL  01-listener ($which): missing from the listener output:"
for m in "${missing[@]}"; do echo "      - $m"; done
[ ${#missing[@]} -eq 0 ] && echo "      - the run itself failed (exit code $rc)"
exit 1
