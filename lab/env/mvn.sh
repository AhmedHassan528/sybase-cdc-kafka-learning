#!/usr/bin/env bash
# Run Maven for a lab module inside a container.
# Usage: mvn.sh <module directory relative to lab/> <maven arguments...>      e.g. mvn.sh solutions/01-listener test
# Needs Docker only. The first run downloads dependencies into the volume cdc-m2-cache; later runs work offline.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
module=${1:?usage: mvn.sh <module directory relative to lab/> <maven arguments>}; shift
[[ "$module" =~ ^[A-Za-z0-9._/-]+$ && "$module" != *..* ]] || { echo "invalid module path" >&2; exit 2; }
[ -f "$LAB_ROOT/lab/$module/pom.xml" ] || { echo "no pom.xml in lab/$module" >&2; exit 2; }
exec docker run --rm -v "$LAB_ROOT/lab:/lab" -v "$MAVEN_CACHE_VOLUME:/root/.m2" -w "/lab/$module" "$MAVEN_IMAGE" mvn -B -f pom.xml "$@"
