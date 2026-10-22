#!/usr/bin/env bash
# Reliability experiment 2: kill the connector shortly after it published, then bring it back. Repeats with different
# delays between the commit and the kill, and stops at the first attempt that shows a duplicate.
#
# EXPECTED (written before the first run): no row is ever lost. Connect saves the connector's position only every
# 5 seconds (offset.flush.interval.ms=5000). If the process is killed after rows were published but before that save,
# the restarted connector tells ASE an older position, ASE sends those rows again, and the topic holds them twice, with
# the same source.oqid. Whether an attempt shows a duplicate depends on where in the 5-second cycle the kill lands.
# OBSERVED: see the output of the run (docs/evidence/26-crash-duplicates.txt).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env/_common.sh"
T=sybase.phoenix_test.payment
DELAYS=${DELAYS:-"1 2 3 1.5 2.5"}          # seconds between the commit of the 5 rows and the kill
re='^[0-9. ]+$'; [[ "$DELAYS" =~ $re ]] || { echo "invalid DELAYS" >&2; exit 2; }
attempt=0

for delay in $DELAYS; do
  attempt=$((attempt + 1))
  TAG=CR$(date +%H%M%S)A$attempt
  echo "== attempt $attempt: 5 rows (tag $TAG), kill $delay s after the commit"
  ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-1', 1, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-2', 2, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-3', 3, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-4', 4, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-5', 5, 'EUR')
go
SQL
  sleep "$delay"
  docker kill "$CONNECT" >/dev/null
  docker start "$CONNECT" >/dev/null
  wait_for "Kafka Connect REST answers again" 180 curl -fsS "$CONNECT_URL/connectors"
  wait_for "connector task RUNNING" 60 bash -c "curl -fsS $CONNECT_URL/connectors/$CONNECTOR_NAME/status | grep -q '\"tasks\":\[{\"id\":0,\"state\":\"RUNNING\"'"

  # ASE only reconnects when it has something to send, so write a sentinel row and wait for it.
  ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-6', 6, 'EUR')
go
SQL
  "$LAB_ENV_DIR/await-event.sh" $T "$TAG-6" 240 >/dev/null || echo "TIMEOUT: sentinel row $TAG-6 never arrived"
  sleep 10   # let any re-sent rows arrive too
  result=$("$HERE/find-duplicates.sh" $T $TAG) || { echo "ERROR: could not measure attempt $attempt: $result"; exit 1; }
  echo "$result"
  dups=$(grep -oE 'duplicated events: +[0-9]+' <<<"$result" | grep -oE '[0-9]+$')
  rows=$(grep -oE 'distinct rows by account_no: [0-9]+' <<<"$result" | grep -oE '[0-9]+$')
  [ -n "$rows" ] && [ -n "$dups" ] || { echo "ERROR: could not read the counts for attempt $attempt"; exit 1; }
  echo "-- attempt $attempt: rows delivered $rows of 6, duplicated events $dups"
  if [ "$dups" -gt 0 ]; then echo "== duplicate observed at attempt $attempt (kill $delay s after the commit); stopping"; exit 0; fi
done
echo "== no duplicate observed in $attempt attempts"
