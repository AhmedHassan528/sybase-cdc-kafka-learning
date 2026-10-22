#!/usr/bin/env bash
# Start the lab: ASE, Kafka, Kafka Connect, Kafka UI. Safe to run again.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

"${COMPOSE[@]}" up -d --build

wait_for "ASE finished first-boot init (READY)" 900 bash -c "docker logs $ASE 2>&1 | grep -q '=== READY'"
wait_for "Kafka healthy" 120 docker exec "$KAFKA" /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server kafka:9092
wait_for "Kafka Connect REST answers" 120 curl -fsS "$CONNECT_URL/connectors"
"$LAB_ENV_DIR/create-accounts.sh"
echo "Lab is up. Next: lab/env/register-connector.sh, then lab/env/changes.sh"
