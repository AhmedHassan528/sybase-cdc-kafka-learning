#!/usr/bin/env bash
# Section 7 experiment: where does the connector restart from, and how can you choose the point?
#
# EXPECTED (written before the first complete run, from a manual trial):
#  1. The REST offsets view (GET /connectors/<name>/offsets) shows "offset": null although _connect-offsets holds a
#     position, because the task stores its partition key as {"database","server"} and the REST view uses
#     {"server","database"}. A REST PATCH therefore changes only the REST view; the task still starts from its own value.
#  2. Writing a record to _connect-offsets with the task's exact key (connector stopped) moves the start position: the task
#     log shows the value we wrote.
#  3. Writing an OLDER position makes ASE send again every row after it that ASE still holds, so already delivered rows
#     appear again (duplicates, same source.oqid). Nothing is lost.
#  4. A tombstone (null value) for that key resets the position to "none (first start)"; ASE then sends again what it
#     still holds.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env/_common.sh"
export MSYS_NO_PATHCONV=1
T=sybase.phoenix_test.payment
U="$CONNECT_URL/connectors/$CONNECTOR_NAME"
KEY="[\"$CONNECTOR_NAME\",{\"database\":\"phoenix_test\",\"server\":\"MYSYBASE\"}]"
TAG=OS$(date +%H%M%S)

offsets_topic() { docker exec "$KAFKA" /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic _connect-offsets --from-beginning --timeout-ms 6000 --property print.key=true --property key.separator=' => ' 2>/dev/null; }
stored_positions() { offsets_topic | grep -F '"database":"phoenix_test","server"' | grep -o '"commit_oqid":"[0-9a-f]*"' | cut -d'"' -f4 | sort -u; }
start_line() { docker logs "$CONNECT" 2>&1 | grep "Starting Sybase CDC task" | tail -n 1 | sed -E 's/.*last committed OQID in Kafka: //; s/ \(com\.phoenix.*//'; }
write_offset() {   # write_offset <oqid|NULL>: only with the connector stopped
  local v=$1; [ "$v" = NULL ] || v="{\"commit_oqid\":\"$v\"}"
  printf '%s\n' "$KEY|$v" | docker exec -i "$KAFKA" /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:9092 --topic _connect-offsets --property parse.key=true --property 'key.separator=|' --property null.marker=NULL 2>&1 | grep -v '^$' | head -n 2
}
stop_connector() { curl -fsS -X PUT "$U/stop" >/dev/null; sleep 5; }
resume_connector() { curl -fsS -X PUT "$U/resume" >/dev/null; wait_for "connector task RUNNING" 90 bash -c "curl -fsS $U/status | grep -q '\"tasks\":\[{\"id\":0,\"state\":\"RUNNING\"'"; sleep 6; }
wake() {           # ASE only reconnects when it has something to send
  ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-$1', $1, 'EUR')
go
SQL
  "$HERE/../env/await-event.sh" $T "$TAG-$1" 240 >/dev/null || echo "TIMEOUT: row $TAG-$1 never arrived"; sleep 10
}
count() { "$HERE/find-duplicates.sh" $T "$TAG" | sed -n '1,3p' | tr -s ' ' | tr '\n' ' '; echo; }

echo "== 0. three rows (tag $TAG), delivered normally"
ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-A', 1, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-B', 2, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-C', 3, 'EUR')
go
SQL
"$HERE/../env/await-event.sh" $T "$TAG-C" 120 >/dev/null || echo "TIMEOUT: rows never arrived"; sleep 12
echo "events: $(count)"
NEWEST=$(stored_positions | tail -n 1)
echo "newest stored position: $NEWEST"

echo; echo "== 1. REST offsets view compared with the topic"
echo "REST GET : $(curl -s "$U/offsets" | cut -c1-200)"
echo "topic    : $(offsets_topic | grep -F '"database":"phoenix_test","server"' | tail -n 1 | cut -c1-200)"
stop_connector
OLDER=$(stored_positions | tail -n 4 | head -n 1)
echo "REST PATCH to an older value ($OLDER):"
curl -s -X PATCH -H 'Content-Type: application/json' -d "{\"offsets\":[{\"partition\":{\"server\":\"MYSYBASE\",\"database\":\"phoenix_test\"},\"offset\":{\"commit_oqid\":\"$OLDER\"}}]}" "$U/offsets" | cut -c1-120; echo
echo "REST GET after PATCH: $(curl -s "$U/offsets" | cut -c1-230)"
resume_connector
echo "task started from   : $(start_line)"
echo "(newest stored was  : $NEWEST)"

echo; echo "== 2. write an older position directly into _connect-offsets (connector stopped)"
stop_connector
write_offset "$OLDER"
resume_connector
echo "task started from   : $(start_line)"
echo "(chosen position    : $OLDER)"
before=$(count); wake 1
echo "events with tag before / after the rewind: $before / $(count)"

echo; echo "== 3. reset to none with a tombstone (connector stopped)"
stop_connector
write_offset NULL
resume_connector
echo "task started from   : $(start_line)"
before=$(count); wake 2
echo "events with tag before / after the reset  : $before / $(count)"

echo; echo "== 4. restore: the connector is $(curl -s "$U/status" | grep -o '"state":"[A-Z]*"' | head -n 1), RepAgent: $(printf "sp_help_rep_agent phoenix_test, 'process'\ngo\n" | ase_admin | sed -n 4p | tr -s ' ' | cut -c1-90)"
