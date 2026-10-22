#!/usr/bin/env bash
# Print the events of a topic with their keys. Usage: consume.sh [topic] [timeout-ms]
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
# Input validation: a Kafka topic name and a number only.
[[ "${1:-$TOPIC}" =~ ^[A-Za-z0-9._-]+$ && "${2:-8000}" =~ ^[0-9]+$ ]] || { echo "invalid topic or timeout" >&2; exit 2; }
docker exec "$KAFKA" /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 \
  --topic "${1:-$TOPIC}" --from-beginning --timeout-ms "${2:-8000}" \
  --property print.key=true --property key.separator=' | ' 2>/dev/null
