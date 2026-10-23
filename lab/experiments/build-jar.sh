#!/usr/bin/env bash
# Builds the reference connector JAR (increment 6 solution) with Maven in a container and inspects it.
# Shows what the article's "build the JAR" section claims: the command, the file produced, the classes inside,
# that the connector class is there, and that the Kafka Connect API and slf4j are NOT packaged (the Connect runtime provides them).
# Needs Docker only. Bash only; on Windows run it in Git Bash. Exit 1 if any expectation fails.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_ROOT="$(cd "$HERE/../.." && pwd)"
JAR="$LAB_ROOT/lab/solutions/06-package-and-run/target/cdc-lab-06-package-and-run-0.1.0.jar"
rm -f "$JAR"
echo '$ lab/env/mvn.sh solutions/06-package-and-run package -DskipTests'
t0=$(date +%s)
"$LAB_ROOT/lab/env/mvn.sh" solutions/06-package-and-run package -DskipTests -q; rc=$?
echo "maven exit code: $rc, $(( $(date +%s) - t0 )) s"
[ $rc -eq 0 ] && [ -f "$JAR" ] || { echo "FAIL: no JAR produced"; exit 1; }
echo "file: lab/solutions/06-package-and-run/target/$(basename "$JAR")  ($(wc -c < "$JAR") bytes)"
list="$(unzip -Z1 "$JAR")"
classes=$(grep -c '\.class$' <<<"$list")
echo "classes in the JAR: $classes"
echo "class files per package of ours:"
grep '\.class$' <<<"$list" | grep -o '^com/phoenix/cdc/sybase/[a-z]*/' | sort | uniq -c | sed 's/^/  /'
bad=0
chk() { if eval "$2"; then echo "ok: $1"; else echo "FAIL: $1"; bad=1; fi; }
chk "the connector class com/phoenix/cdc/sybase/connect/SybaseCdcSourceConnector.class is in the JAR" 'grep -q "^com/phoenix/cdc/sybase/connect/SybaseCdcSourceConnector.class$" <<<"$list"'
chk "the task class SybaseCdcSourceTask.class is in the JAR" 'grep -q "^com/phoenix/cdc/sybase/connect/SybaseCdcSourceTask.class$" <<<"$list"'
chk "no Kafka Connect API classes (org/apache/kafka/connect/) are packaged" '! grep -q "^org/apache/kafka/connect/" <<<"$list"'
chk "no slf4j classes (org/slf4j/) are packaged" '! grep -q "^org/slf4j/" <<<"$list"'
chk "no JUnit classes (org/junit/) are packaged" '! grep -q "^org/junit/" <<<"$list"'
exit $bad
 <<<"$list" | grep -o '^com/phoenix/cdc/sybase/[a-z]*/' | sort | uniq -c | sed 's/^/  /'
bad=0
chk() { if eval "$2"; then echo "ok: $1"; else echo "FAIL: $1"; bad=1; fi; }
chk "the connector class com/phoenix/cdc/sybase/connect/SybaseCdcSourceConnector.class is in the JAR" 'grep -q "^com/phoenix/cdc/sybase/connect/SybaseCdcSourceConnector.class$" <<<"$list"'
chk "the task class SybaseCdcSourceTask.class is in the JAR" 'grep -q "^com/phoenix/cdc/sybase/connect/SybaseCdcSourceTask.class$" <<<"$list"'
chk "no Kafka Connect API classes (org/apache/kafka/connect/) are packaged" '! grep -q "^org/apache/kafka/connect/" <<<"$list"'
chk "no slf4j classes (org/slf4j/) are packaged" '! grep -q "^org/slf4j/" <<<"$list"'
chk "no JUnit classes (org/junit/) are packaged" '! grep -q "^org/junit/" <<<"$list"'
exit $bad
