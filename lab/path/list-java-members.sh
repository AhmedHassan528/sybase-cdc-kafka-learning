#!/usr/bin/env bash
# Lists every class, constructor and method of the finished connector (sybase-cdc-connector/, the code that runs in the lab)
# with javap, inside the pinned Maven image, and writes lab/path/java-members.json for the learning path's Java lessons.
# Lambdas and compiler-generated methods are dropped. Needs Docker and Node. Used by docs-src/site-checks/path-java.js.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
MOD="$LAB_ROOT/sybase-cdc-connector"
OUT="$LAB_ENV_DIR/../path/java-members.json"
RAW="$(mktemp)"; NEW="$(mktemp)"
trap 'rm -f "$RAW" "$NEW"' EXIT
docker run --rm -v "$MOD:/src" -v "$MAVEN_CACHE_VOLUME:/root/.m2" -w /src "$MAVEN_IMAGE" sh -c \
  'mvn -B -q compile >/dev/null 2>&1 && cd target/classes && find . -name "*.class" | sort | xargs javap -p' > "$RAW" || { echo "FAIL: the javap run failed"; exit 1; }
node "$LAB_ENV_DIR/../path/java-members.js" "$(cygpath -m "$RAW" 2>/dev/null || echo "$RAW")" > "$NEW" || { echo "FAIL: could not read the javap output"; exit 1; }
cp "$NEW" "$OUT"
node -e "const j=require(process.argv[1]);const c=Object.values(j.classes);console.log('classes:',c.length,'members:',c.reduce((a,x)=>a+x.members.length,0))" "$(cd "$LAB_ENV_DIR/../path" && pwd -W 2>/dev/null || pwd)/java-members.json"
