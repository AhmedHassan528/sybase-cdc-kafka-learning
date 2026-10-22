#!/usr/bin/env bash
# One transaction touching two tables: which topics get events, and what do they share?
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
"$LAB_ENV_DIR/set-tables.sh" payment,customer,ltl_types
TAG=TXN$(date +%H%M%S)

ase_app >/dev/null <<SQL
begin tran
go
insert into customer (full_name, country) values ('$TAG', 'EG')
go
insert into payment (account_no, amount, currency) values ('$TAG', 42.00, 'EUR')
go
commit tran
go
SQL

for t in customer payment; do
  echo "-- $t topic (fields that identify the transaction):"
  KEEP_SOURCE=1 "$LAB_ENV_DIR/await-event.sh" sybase.phoenix_test.$t "$TAG" 120 \
    | grep -oE '"table":"[a-z]+"|"xid":"[0-9a-f]+"|"commit_oqid":"[0-9a-f]+"|"seq":[0-9]+|"txn_rows":[0-9]+' | tr '\n' ' '
  echo
done
