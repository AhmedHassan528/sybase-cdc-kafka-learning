#!/usr/bin/env bash
# Live check of increment 3: the real RepAgent sends a rolled-back and a committed transaction to YOUR code.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
# Needs the lab running (lab/env/start.sh) and the connector registered. It stops the connector while it runs and
# resumes it at the end. It writes a row (LIVE<time>-RB) in a transaction it rolls back and then a row (LIVE<time>-1)
# in a committed transaction. It passes when your buffer reports the committed row and never reports the rolled-back one.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
which=${1:-starter}
case "$which" in
  starter)  module="increments/03-transaction-buffer/starter" ;;
  solution) module="solutions/03-transaction-buffer" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc3-build.log 2>&1 || { echo "FAIL  03-transaction-buffer ($which): the code does not compile"; grep -E '\[ERROR\] .*\.java' /tmp/inc3-build.log | head -n 1 | sed 's/^/      /'; exit 1; }

out=$("$ENV/run-listener-live.sh" "lab/$module/target/cdc-lab-03-transaction-buffer-0.1.0.jar" com.phoenix.cdc.lab.Increment3Main --also-rollback --wait-for "account_no=@TAG@-1]" 2>&1); rc=$?
tag=$(grep -oE 'tag LIVE[0-9]+' <<<"$out" | head -n 1 | cut -d' ' -f2)
echo "$out" | grep -E '^\[inc3\]|^== |Exception' | cut -c1-200 | sed -n '1,12p'

missing=()
[ -n "$tag" ] || missing+=("the run did not report its row tag")
if [ -n "$tag" ]; then
  grep -E '^\[inc3\] COMMITTED ' <<<"$out" | grep -qF "payment:account_no=$tag-1]" || missing+=("a COMMITTED line with the committed row $tag-1")
  if grep -qF "$tag-RB" <<<"$out"; then missing+=("NO output for the rolled-back row $tag-RB, but your buffer released it"); fi
fi
if [ $rc -eq 0 ] && [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  03-transaction-buffer ($which): the committed row ($tag-1) was released at COMMIT and the rolled-back row ($tag-RB) never was"
  exit 0
fi
echo "FAIL  03-transaction-buffer ($which):"
for m in "${missing[@]}"; do echo "      - $m"; done
[ ${#missing[@]} -eq 0 ] && echo "      - the run itself failed (exit code $rc)"
exit 1
