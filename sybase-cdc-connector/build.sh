#!/usr/bin/env bash
# Builds the connector with Maven inside Docker (no local Java/Maven needed)
# and copies the JAR into ../plugins/sybase-cdc for the local Connect worker.
set -euo pipefail
cd "$(dirname "$0")"
SRC="$(pwd -W 2>/dev/null || pwd)"
MSYS_NO_PATHCONV=1 docker run --rm -v "$SRC:/src" -v cdc-m2-cache:/root/.m2 -w /src \
  maven:3.9-eclipse-temurin-17 mvn -B -q package "$@"
mkdir -p ../plugins/sybase-cdc
cp target/sybase-cdc-connector-*.jar ../plugins/sybase-cdc/
ls -l ../plugins/sybase-cdc
