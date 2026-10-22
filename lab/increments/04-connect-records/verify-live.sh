#!/usr/bin/env bash
# Live check of increment 4: the event your mapper builds for a real change made in the real ASE.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
# Needs the lab running (lab/env/start.sh) and the connector registered. It stops the connector while it runs and
# resumes it at the end. It writes one row (account LIVE<time>-1) as the login cdc_app and passes when the line your
# code prints has the right topic, key, op, after image and source block.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
which=${1:-starter}
case "$which" in
  starter)  module="increments/04-connect-records/starter" ;;
  solution) module="solutions/04-connect-records" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc4-build.log 2>&1 || { echo "FAIL  04-connect-records ($which): the code does not compile"; grep -E '\[ERROR\] .*\.java' /tmp/inc4-build.log | head -n 1 | sed 's/^/      /'; exit 1; }

out=$("$ENV/run-listener-live.sh" "lab/$module/target/cdc-lab-04-connect-records-0.1.0.jar" com.phoenix.cdc.sybase.connect.Increment4Main --wait-for "account_no=@TAG@-1," 2>&1); rc=$?
tag=$(grep -oE 'tag LIVE[0-9]+' <<<"$out" | head -n 1 | cut -d' ' -f2)
echo "$out" | grep -E '^== |Exception' | cut -c1-200 | sed -n '1,6p'
line=""
[ -n "$tag" ] && line=$(grep -E '^\[inc4\] ' <<<"$out" | grep -F "account_no=$tag-1," | head -n 1)
echo "event line: ${line:0:420}"

missing=()
if [ -z "$tag" ]; then
  if grep -q "did not stay running" <<<"$out"; then missing+=("your listener crashed at start; the exception is printed above"); else missing+=("the run did not report its row tag"); fi
fi
[ -z "$tag" ] || [ -n "$line" ] || missing+=("an event line for the row $tag-1")
if [ -n "$line" ]; then
  grep -qF "topic=sybase.phoenix_test.payment " <<<"$line"        || missing+=("topic=sybase.phoenix_test.payment")
  grep -qE "key=\{payment_id=[0-9]+\} " <<<"$line"                  || missing+=("key={payment_id=<number>}")
  grep -qF "value={op=c, before=null, after={" <<<"$line"           || missing+=("value starting {op=c, before=null, after={")
  grep -qF "source={server=MYSYBASE, db=phoenix_test, owner=dbo, table=payment, xid=" <<<"$line" || missing+=("a source block starting server=MYSYBASE, db=phoenix_test, owner=dbo, table=payment, xid=")
  grep -qF "user=cdc_app, seq=0, txn_rows=1}" <<<"$line"            || missing+=("source ending user=cdc_app, seq=0, txn_rows=1")
  grep -qE ", ts_ms=[0-9]+\}$" <<<"$line"                           || missing+=("value ending with ts_ms=<milliseconds>")
fi
if [ $rc -eq 0 ] && [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  04-connect-records ($which): your mapper built the event for the row we just wrote ($tag-1) from the real RepAgent's changes"
  exit 0
fi
echo "FAIL  04-connect-records ($which): missing from the listener output:"
for m in "${missing[@]}"; do echo "      - $m"; done
[ ${#missing[@]} -eq 0 ] && echo "      - the run itself failed (exit code $rc)"
exit 1
