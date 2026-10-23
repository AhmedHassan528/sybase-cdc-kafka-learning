#!/usr/bin/env bash
# Builds the finished connector (sybase-cdc-connector/) with Maven in a container and compares the result with the JAR the lab runs.
# It does NOT copy the new JAR into plugins/ (sybase-cdc-connector/build.sh does that), so the running lab is not changed.
# Used by lesson 8.1 of the learning path. Needs Docker only. Exit 1 if the build fails or the class lists differ.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
MOD="$LAB_ROOT/sybase-cdc-connector"
JAR_NEW="$MOD/target/sybase-cdc-connector-0.1.0.jar"
JAR_LAB="$LAB_ROOT/plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar"
rm -f "$JAR_NEW"
echo '$ docker run --rm -v <repository>/sybase-cdc-connector:/src -w /src <pinned maven image> mvn -B -q package'
t0=$(date +%s)
docker run --rm -v "$MOD:/src" -v "$MAVEN_CACHE_VOLUME:/root/.m2" -w /src "$MAVEN_IMAGE" mvn -B -q package
rc=$?
echo "maven exit code: $rc, $(( $(date +%s) - t0 )) s"
[ $rc -eq 0 ] && [ -f "$JAR_NEW" ] || { echo "FAIL: no JAR produced"; exit 1; }
echo "built: sybase-cdc-connector/target/$(basename "$JAR_NEW") ($(wc -c < "$JAR_NEW") bytes)"
new="$(unzip -Z1 "$JAR_NEW" | grep '\.class$' | sort)"
lab="$(unzip -Z1 "$JAR_LAB" | grep '\.class$' | sort)"
echo "class files in the new JAR: $(wc -l <<<"$new")"
echo "class files in the JAR the lab runs (plugins/sybase-cdc): $(wc -l <<<"$lab")"
if [ "$new" = "$lab" ]; then echo "ok: both JARs contain exactly the same class files"; else echo "DIFFERENT class lists:"; diff <(echo "$lab") <(echo "$new"); exit 1; fi
