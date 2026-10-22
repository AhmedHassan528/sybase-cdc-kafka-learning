#!/usr/bin/env bash
# Live check of increment 5: your watermark with real transactions from the real ASE.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
# Needs the lab running (lab/env/start.sh) and the connector registered. It stops the connector while it runs and
# resumes it at the end. It writes two committed rows, LIVE<time>-1 and then LIVE<time>-2, each in its own transaction.
# A fake Kafka (given) confirms the -2 transaction after 0.3 s and the -1 transaction only after 4 s. It passes when
#   - your watermark does NOT move to the -2 transaction while the older -1 transaction is unconfirmed, and
#   - once -1 is confirmed, the watermark jumps to the commit position of the -2 transaction.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
which=${1:-starter}
case "$which" in
  starter)  module="increments/05-acks-and-offsets/starter" ;;
  solution) module="solutions/05-acks-and-offsets" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc5-build.log 2>&1 || { echo "FAIL  05-acks-and-offsets ($which): the code does not compile"; grep -E '\[ERROR\] .*\.java' /tmp/inc5-build.log | head -n 1 | sed 's/^/      /'; exit 1; }

out=$("$ENV/run-listener-live.sh" "lab/$module/target/cdc-lab-05-acks-and-offsets-0.1.0.jar" com.phoenix.cdc.lab.Increment5Main --second-row --settle 8 --wait-for "rows=[@TAG@-2]" 2>&1); rc=$?
tag=$(grep -oE 'tag LIVE[0-9]+' <<<"$out" | head -n 1 | cut -d' ' -f2)
echo "$out" | grep -E '^== |Exception' | cut -c1-200 | sed -n '1,6p'

missing=()
if [ -z "$tag" ]; then
  if grep -q "did not stay running" <<<"$out"; then missing+=("your listener crashed at start; the exception is printed above"); else missing+=("the run did not report its row tag"); fi
else
  h1=$(grep -F "rows=[$tag-1]" <<<"$out" | grep -oE 'commit_oqid=[0-9a-f]+' | head -n 1 | cut -d= -f2)
  h2=$(grep -F "rows=[$tag-2]" <<<"$out" | grep -oE 'commit_oqid=[0-9a-f]+' | head -n 1 | cut -d= -f2)
  echo "transaction of $tag-1 commits at ${h1:-?}"
  echo "transaction of $tag-2 commits at ${h2:-?}"
  if [ -z "$h1" ] || [ -z "$h2" ]; then
    missing+=("committed lines for both rows $tag-1 and $tag-2 (the transactions were not reported)")
  else
    c2=$(grep -F "[inc5] confirmed commit_oqid=$h2 " <<<"$out" | head -n 1)
    c1=$(grep -F "[inc5] confirmed commit_oqid=$h1 " <<<"$out" | head -n 1)
    echo "  ${c2:-no confirmation line for the -2 transaction}"
    echo "  ${c1:-no confirmation line for the -1 transaction}"
    w2=$(grep -oE 'watermark=[0-9a-f]*' <<<"$c2" | cut -d= -f2)
    w1=$(grep -oE 'watermark=[0-9a-f]*' <<<"$c1" | cut -d= -f2)
    [ -n "$c2" ] || missing+=("the fake Kafka confirmed the -2 transaction (look for 'confirmed' above)")
    [ -n "$c1" ] || missing+=("the fake Kafka confirmed the -1 transaction")
    if [ -n "$c2" ] && [ "$w2" = "$h2" ]; then missing+=("a watermark that waits: it moved to the -2 transaction while the older -1 transaction was still unconfirmed"); fi
    if [ -n "$c1" ] && [ "$w1" != "$h2" ]; then missing+=("a watermark that jumps to the -2 transaction once -1 is confirmed (it was ${w1:-empty})"); fi
  fi
fi
if [ $rc -eq 0 ] && [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  05-acks-and-offsets ($which): the watermark waited for the older transaction, then jumped to the newer one"
  exit 0
fi
echo "FAIL  05-acks-and-offsets ($which): missing from the listener output:"
for m in "${missing[@]}"; do echo "      - $m"; done
[ ${#missing[@]} -eq 0 ] && echo "      - the run itself failed (exit code $rc)"
exit 1
