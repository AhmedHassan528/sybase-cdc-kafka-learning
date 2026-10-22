#!/usr/bin/env bash
# Symptom: "I changed a row and nothing arrived."
# Cause shown here: the table is marked in ASE but missing from table.include.list.
# Then we add it to the list and see what happens to the row written while it was missing.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.customer
TAG=$(date +%H%M%S)   # makes this run's rows easy to find among earlier ones
insert() { ase_app >/dev/null <<SQL
insert into customer (full_name, country) values ('$1 $TAG', 'EG')
go
SQL
}

echo "== 1. customer is NOT on the include list"
"$LAB_ENV_DIR/set-tables.sh" payment
insert "Before list"
echo "-- waiting 60 s for an event with $TAG on $T (expect none):"
"$LAB_ENV_DIR/await-event.sh" $T "$TAG" 60 || echo "no event (as expected)"

echo "== 2. add customer to the list, then write a second row"
"$LAB_ENV_DIR/set-tables.sh" payment,customer
insert "After list"
echo "-- events with $TAG on $T:"
"$LAB_ENV_DIR/await-event.sh" $T "After list $TAG" 120 || true
TOPIC=$T "$LAB_ENV_DIR/consume.sh" | grep -F "$TAG" | sed -E 's/"source":\{[^}]*\},//'
