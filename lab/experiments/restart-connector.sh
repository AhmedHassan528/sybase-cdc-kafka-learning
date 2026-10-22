#!/usr/bin/env bash
# Reliability experiment 1: restart the connector while changes are being written.
#
# EXPECTED (written before the first run): every one of the 30 rows is delivered at least once, so no row is missing.
# Duplicates are allowed; if there are any, they carry the same source.oqid as the original.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.payment
TAG=RS$(date +%H%M%S); N=30

echo "== writing $N rows (tag $TAG) in the background, one transaction each"
(
  for i in $(seq 1 $N); do
    ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-$i', $i, 'EUR')
go
SQL
  done
) &
writer=$!

sleep 5
echo "== restarting the connect container while the writer is still running"
docker restart "$CONNECT" >/dev/null
wait_for "Kafka Connect REST answers again" 180 curl -fsS "$CONNECT_URL/connectors"
wait "$writer"
echo "== all $N rows are committed in ASE; waiting for delivery"

start=$(date +%s)
until [ "$(TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 4000 | grep -oE "\"$TAG-[0-9]+\"" | sort -u | wc -l)" -ge $N ]; do
  [ $(( $(date +%s) - start )) -gt 240 ] && { echo "TIMEOUT: not all rows arrived"; break; }
done
echo "== result"
"$LAB_ENV_DIR/../experiments/find-duplicates.sh" $T $TAG
