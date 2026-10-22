#!/usr/bin/env bash
# Feasibility check for a live test of build-along increments 1 and 2 (finding U1).
#
# QUESTION: can a Java listener that is NOT the connector receive the real RepAgent connection and LTL from the lab ASE?
# METHOD: stop the connector (a stopped connector releases port 11752), start the finished project's stand-in listener
# (LtlProbe, built from the same LtlServer and LtlParser classes the increments teach) inside the Connect container,
# write one row, and read the probe's log.
# EXPECTED (written before the first run): the probe logs the RepAgent login and "connect source", then BEGIN, INSERT and
# COMMIT for the tagged row. Afterwards the connector is resumed and must deliver a new row again.
# I also expected: because the probe acknowledges what it sees, the tagged row would NOT reach Kafka.
# OBSERVED (first complete run, evidence 34): the probe logged login, connect source, BEGIN/INSERT/COMMIT; after the
# connector was resumed it delivered the tagged row too (count 1), so the probe's acknowledgement did not stop delivery.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
TAG=U1$(date +%H%M%S)
T=sybase.phoenix_test.payment
probe_running() { docker exec "$CONNECT" sh -c 'ps -ef | grep -c "[L]tlProbe"' | tr -d '\r'; }

echo "== 1. stop the connector so port 11752 is free"
curl -fsS -X PUT "$CONNECT_URL/connectors/$CONNECTOR_NAME/stop"; sleep 5
curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" | grep -o '"state":"STOPPED"' | head -n 1

echo "== 2. start the probe inside the Connect container"
docker exec "$CONNECT" sh -c 'rm -f /tmp/probe.log'
docker exec -d "$CONNECT" bash -c 'java -cp "/opt/kafka/libs/*:/opt/connectors/sybase-cdc/*" com.phoenix.cdc.sybase.tools.LtlProbe 11752 rs_user rs_password > /tmp/probe.log 2>&1'
sleep 4
echo "-- probe processes running: $(probe_running)"

echo "== 3. write one row ($TAG-1) and wait for the RepAgent to connect to the probe"
ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-1', 1, 'EUR')
go
SQL
for i in $(seq 1 40); do
  docker exec "$CONNECT" sh -c 'grep -q "\[probe\] ==> COMMITTED" /tmp/probe.log' 2>/dev/null && break
  sleep 3
done
sleep 3
echo "-- probe log lines (login, connect source, commands, committed transaction):"
docker exec "$CONNECT" sh -c 'grep "\[probe\]" /tmp/probe.log | cut -c1-150 | head -n 8'
echo "-- lines for the tagged row: $(docker exec "$CONNECT" sh -c "grep -c '$TAG-1' /tmp/probe.log" | tr -d '\r')"

echo "== 4. stop the probe and resume the connector"
docker exec "$CONNECT" sh -c 'kill $(ps -ef | grep "[L]tlProbe" | awk "{print \$2}")' ; sleep 2
echo "-- probe processes running: $(probe_running)"
curl -fsS -X PUT "$CONNECT_URL/connectors/$CONNECTOR_NAME/resume"
wait_for "connector task RUNNING" 60 bash -c "curl -fsS $CONNECT_URL/connectors/$CONNECTOR_NAME/status | grep -q '\"tasks\":\[{\"id\":0,\"state\":\"RUNNING\"'"
ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-2', 2, 'EUR')
go
SQL
if "$LAB_ENV_DIR/await-event.sh" $T "$TAG-2" 180 >/dev/null; then echo "connector delivers again: row $TAG-2 reached Kafka"; else echo "TIMEOUT: connector did not deliver row $TAG-2"; fi
echo "row $TAG-1 (seen by the probe) in Kafka after the connector resumed: $(TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 5000 | grep -c "$TAG-1")"
