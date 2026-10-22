#!/usr/bin/env bash
# Is the final build-along solution the same connector as the finished one in sybase-cdc-connector/ ?
#   1. runs the finished project's own unit tests (Maven in a container);
#   2. lists every difference between the two source trees;
#   3. runs the finished project's tests that exercise the shared classes against the SOLUTION's sources is not needed:
#      the solution's own 51 checkpoints already include the same parser, buffer and tracker tests (lab/env/verify-increment.sh).
# The live check of increment 6 (verify-live.sh solution) is the proof that the solution delivers a real change to Kafka.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
cd "$LAB_ROOT"

echo "== 1. the finished project's own unit tests"
out=$(docker run --rm -v "$LAB_ROOT:/repo" -v "$MAVEN_CACHE_VOLUME:/root/.m2" -w /repo/sybase-cdc-connector "$MAVEN_IMAGE" mvn -B test 2>&1)
grep -E 'Tests run:|BUILD' <<<"$out" | tail -n 8

echo
echo "== 2. differences between the finished sources and lab/solutions/06-package-and-run (main code)"
diff -rq sybase-cdc-connector/src/main/java lab/solutions/06-package-and-run/src/main/java \
  | sed -e 's#sybase-cdc-connector/src/main/java#FINISHED#g' -e 's#lab/solutions/06-package-and-run/src/main/java#SOLUTION#g'
echo
echo "-- the differences, line by line (FINISHED vs SOLUTION):"
for f in ltl/LtlListener.java ltl/LtlServer.java ltl/LtlSession.java; do
  echo "### $f"
  diff -u "sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/$f" "lab/solutions/06-package-and-run/src/main/java/com/phoenix/cdc/sybase/$f" | grep -E '^[-+][^-+]' | cut -c1-160
done
echo
echo "== 3. files identical in both trees: $(diff -rq sybase-cdc-connector/src/main/java lab/solutions/06-package-and-run/src/main/java >/dev/null 2>&1; comm -12 <(cd sybase-cdc-connector/src/main/java && find . -name '*.java' | sort) <(cd lab/solutions/06-package-and-run/src/main/java && find . -name '*.java' | sort) | wc -l) java files in both, of which $(for f in $(comm -12 <(cd sybase-cdc-connector/src/main/java && find . -name '*.java' | sort) <(cd lab/solutions/06-package-and-run/src/main/java && find . -name '*.java' | sort)); do cmp -s "sybase-cdc-connector/src/main/java/$f" "lab/solutions/06-package-and-run/src/main/java/$f" && echo same; done | wc -l) are byte-for-byte the same"
