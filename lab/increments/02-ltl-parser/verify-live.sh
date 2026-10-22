#!/usr/bin/env bash
# Live check of increment 2: the real RepAgent sends LTL to YOUR listener and YOUR parser reads it.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
# Needs the lab running (lab/env/start.sh) and the connector registered. It stops the connector while it runs and
# resumes it at the end. It writes one row with a known account number (LIVE<time>-1) and passes when your parser
# prints an INSERT for table payment whose account_no is exactly that value, between a BEGIN and a COMMIT.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
which=${1:-starter}
case "$which" in
  starter)  module="increments/02-ltl-parser/starter" ;;
  solution) module="solutions/02-ltl-parser" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc2-build.log 2>&1 || { echo "FAIL  02-ltl-parser ($which): the code does not compile"; grep -E '\[ERROR\] .*\.java' /tmp/inc2-build.log | head -n 1 | sed 's/^/      /'; exit 1; }

out=$("$ENV/run-listener-live.sh" "lab/$module/target/cdc-lab-02-ltl-parser-0.1.0.jar" com.phoenix.cdc.lab.Increment2Main --wait-for "account_no=@TAG@-1," 2>&1); rc=$?
tag=$(grep -oE 'tag LIVE[0-9]+' <<<"$out" | head -n 1 | cut -d' ' -f2)
echo "$out" | grep -E '^\[inc2\]|^== |Exception' | cut -c1-200 | sed -n '1,14p'

missing=()
[ -n "$tag" ] || missing+=("the run did not report its row tag")
grep -qF "[inc2] BEGIN" <<<"$out"  || missing+=("a BEGIN command")
grep -qF "[inc2] COMMIT" <<<"$out" || missing+=("a COMMIT command")
if [ -n "$tag" ]; then
  grep -E '^\[inc2\] INSERT payment ' <<<"$out" | grep -qF "account_no=$tag-1," || missing+=("an INSERT payment line with account_no=$tag-1 and its other columns")
fi
if [ $rc -eq 0 ] && [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  02-ltl-parser ($which): your parser decoded the row we just wrote (account_no=$tag-1) from the real RepAgent's LTL"
  exit 0
fi
echo "FAIL  02-ltl-parser ($which): missing from the listener output:"
for m in "${missing[@]}"; do echo "      - $m"; done
[ ${#missing[@]} -eq 0 ] && echo "      - the run itself failed (exit code $rc)"
exit 1
