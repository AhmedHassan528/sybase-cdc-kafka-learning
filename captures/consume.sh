#!/usr/bin/env bash
# Print all events of a topic (default sybase.phoenix_test.payment) with keys.
export MSYS_NO_PATHCONV=1
docker exec cdc-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 \
  --topic "${1:-sybase.phoenix_test.payment}" --from-beginning --timeout-ms "${2:-8000}" \
  --property print.key=true --property key.separator=' | ' 2>/dev/null
