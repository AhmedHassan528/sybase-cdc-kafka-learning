#!/usr/bin/env bash
# Reliability experiment 3: a rolled-back transaction produces no events.
#
# EXPECTED (written before the first run): the row written inside the transaction that is rolled back never appears in
# Kafka; the row written in the committed transaction after it does appear. ASE sends the rolled-back row to the
# connector, which discards it when the rollback arrives.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.payment
TAG=RB$(date +%H%M%S)

echo "== transaction 1 (rolled back) and transaction 2 (committed), tag $TAG"
ase_app >/dev/null <<SQL
begin tran
go
insert into payment (account_no, amount, currency) values ('$TAG-ROLLEDBACK', 1, 'EUR')
go
rollback tran
go
begin tran
go
insert into payment (account_no, amount, currency) values ('$TAG-COMMITTED', 2, 'EUR')
go
commit tran
go
SQL
echo "-- ASE itself holds only the committed row:"
echo "select account_no from payment where account_no like '$TAG%'
go" | ase_app

"$LAB_ENV_DIR/await-event.sh" $T "$TAG-COMMITTED" 120 >/dev/null || echo "TIMEOUT: committed row never arrived"
sleep 6
echo "-- events in Kafka whose account_no contains $TAG:"
TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -F "$TAG" | sed -E 's/"source":\{[^}]*\},//'
rolled=$(TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -c "$TAG-ROLLEDBACK")
echo "events for the rolled-back row: $rolled"
