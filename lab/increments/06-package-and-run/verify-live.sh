#!/usr/bin/env bash
# Live check of increment 6: YOUR connector, packaged as a Kafka Connect plugin, delivers a real change to Kafka.
# Usage: verify-live.sh [starter|solution]       (default starter = your working copy)
#
# What it does (the finished connector is never touched):
#   1. builds your plugin JAR with Maven (the shade plugin makes one self-contained JAR);
#   2. stops the finished connector's container (cdc-lab-connect) and starts a temporary worker, cdc-lab-learner, that has
#      ONLY your plugin. It uses the same host name "connect" so ASE finds it, its own internal topics (_lab6-*) and the
#      event topic prefix lab6, so its events do not mix with the sybase.* topics;
#   3. checks that Connect lists your connector class, registers it, writes one row (LAB6<time>-1) as cdc_app and waits for
#      the event in the topic lab6.phoenix_test.payment;
#   4. ALWAYS removes the temporary worker and its topics and starts the finished connector again.
# Rows written during the check go to lab6.*, not sybase.*. Needs the lab running (lab/env/start.sh).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="$HERE/../../env"
source "$ENV/_common.sh"
which=${1:-starter}
case "$which" in
  starter)  module="increments/06-package-and-run/starter" ;;
  solution) module="solutions/06-package-and-run" ;;
  *) echo "argument must be starter or solution" >&2; exit 2 ;;
esac
LEARNER=cdc-lab-learner
NETWORK=cdc-lab_default
NAME=sybase-cdc-lab6
TOPIC6=lab6.phoenix_test.payment
TAG=LAB6$(date +%H%M%S)
W="http://localhost:8083"
JAR="$LAB_ROOT/lab/$module/target/cdc-lab-06-package-and-run-0.1.0.jar"

echo "building lab/$module ..."
"$ENV/mvn.sh" "$module" package -DskipTests -q >/tmp/inc6-build.log 2>&1 || { echo "FAIL  06-package-and-run ($which): the build failed"; grep -E '\[ERROR\]' /tmp/inc6-build.log | head -n 2 | sed 's/^/      /'; exit 1; }
[ -f "$JAR" ] || { echo "FAIL  06-package-and-run ($which): the build did not produce $JAR"; exit 1; }

cleanup() {
  docker rm -f "$LEARNER" >/dev/null 2>&1
  for t in $(docker exec "$KAFKA" /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list 2>/dev/null | grep -E '^(lab6\.|_lab6-)'); do
    docker exec "$KAFKA" /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --delete --topic "$t" >/dev/null 2>&1
  done
  docker start "$CONNECT" >/dev/null 2>&1
  wait_for "the finished connector is back" 150 bash -c "curl -fsS $W/connectors/$CONNECTOR_NAME/status | grep -q '\"tasks\":\[{\"id\":0,\"state\":\"RUNNING\"'" >/dev/null
}
trap cleanup EXIT

docker stop "$CONNECT" >/dev/null || { echo "cannot stop $CONNECT (is the lab running?)" >&2; exit 1; }

script='mkdir -p /tmp/learner-plugins/learner && cp /tmp/learner.jar /tmp/learner-plugins/learner/ && cat > /tmp/worker.properties <<EOF
bootstrap.servers=kafka:9092
group.id=lab-inc6
key.converter=org.apache.kafka.connect.json.JsonConverter
value.converter=org.apache.kafka.connect.json.JsonConverter
config.storage.topic=_lab6-configs
offset.storage.topic=_lab6-offsets
status.storage.topic=_lab6-status
config.storage.replication.factor=1
offset.storage.replication.factor=1
status.storage.replication.factor=1
listeners=http://0.0.0.0:8083
plugin.path=/tmp/learner-plugins
offset.flush.interval.ms=5000
EOF
exec /opt/kafka/bin/connect-distributed.sh /tmp/worker.properties'
docker rm -f "$LEARNER" >/dev/null 2>&1
docker create --name "$LEARNER" --network "$NETWORK" --network-alias connect --hostname connect -p 127.0.0.1:8083:8083 \
  --entrypoint sh "$(docker inspect "$CONNECT" --format '{{.Config.Image}}')" -c "$script" >/dev/null || { echo "FAIL  cannot create the temporary worker"; exit 1; }
docker cp "$JAR" "$LEARNER:/tmp/learner.jar" >/dev/null && docker start "$LEARNER" >/dev/null

missing=()
if ! wait_for "your worker answers on its REST port" 150 curl -fsS "$W/connector-plugins" >/dev/null; then
  missing+=("the temporary worker did not start; its log ends: $(docker logs "$LEARNER" 2>&1 | tail -n 3 | tr '\n' ' ' | cut -c1-300)")
else
  if curl -fsS "$W/connector-plugins" | grep -q 'com.phoenix.cdc.sybase.connect.SybaseCdcSourceConnector'; then
    echo "ok: Connect lists your connector class (the plugin JAR is packaged correctly)"
  else
    missing+=("Connect does not list com.phoenix.cdc.sybase.connect.SybaseCdcSourceConnector: the plugin JAR is wrong")
  fi
  cfg=$(sed -e "s/\"name\": \"$CONNECTOR_NAME\"/\"name\": \"$NAME\"/" -e 's/"topic.prefix": "sybase"/"topic.prefix": "lab6"/' "$LAB_ROOT/connectors/sybase-cdc-phoenix.json")
  curl -fsS -X POST -H 'Content-Type: application/json' --data "$cfg" "$W/connectors" >/dev/null || missing+=("registering the connector failed")
  sleep 8
  state=$(curl -fsS "$W/connectors/$NAME/status" | grep -o '"tasks":\[{"id":0,"state":"[A-Z]*"' | grep -o '[A-Z]*"$' | tr -d '"')
  if [ "$state" != "RUNNING" ]; then
    missing+=("your task is $state, not RUNNING. Its error: $(curl -fsS "$W/connectors/$NAME/status" | grep -o '"trace":"[^"]*' | head -n 1 | cut -c10-260)")
  else
    echo "ok: your task is RUNNING"
    ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-1', 1, 'EUR')
go
SQL
    line=$(KEEP_SOURCE=1 "$ENV/await-event.sh" "$TOPIC6" "$TAG-1" 200 2>/dev/null)
    echo "event on $TOPIC6: ${line:0:420}"
    [ -n "$line" ] || missing+=("an event with account_no $TAG-1 on topic $TOPIC6 within 200 s")
    if [ -n "$line" ]; then
      grep -qF "{\"payment_id\":\"" <<<"$line"                    || missing+=("a key like {\"payment_id\":\"<n>\"}")
      grep -qF "\"op\":\"c\"" <<<"$line"                          || missing+=("\"op\":\"c\"")
      grep -qF "\"account_no\":\"$TAG-1\"" <<<"$line"             || missing+=("the after image with account_no $TAG-1")
      grep -qE '"source":\{"server":"MYSYBASE","db":"phoenix_test","owner":"dbo","table":"payment"' <<<"$line" || missing+=("the source block")
    fi
  fi
fi

if [ ${#missing[@]} -eq 0 ]; then
  echo "PASS  06-package-and-run ($which): your packaged connector delivered the real change ($TAG-1) to Kafka"
  exit 0
fi
echo "FAIL  06-package-and-run ($which):"
for m in "${missing[@]}"; do echo "      - $m"; done
exit 1
