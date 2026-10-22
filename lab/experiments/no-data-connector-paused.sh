#!/usr/bin/env bash
# Symptom: "I changed a row and nothing arrived", because the connector task is not running.
# We pause the connector, write a row, see nothing, resume, and time how long delivery takes.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.payment
TAG=PAUSE$(date +%H%M%S)

echo "== 1. pause the connector"
curl -fsS -X PUT "$CONNECT_URL/connectors/$CONNECTOR_NAME/pause"
sleep 5
curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" | sed -E 's/.*"connector":\{"state":"([A-Z]+)".*"tasks":\[\{"id":0,"state":"([A-Z]+)".*/connector=\1 task=\2/'

echo "== 2. write a row while it is paused"
ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG', 1.00, 'EUR')
go
SQL
echo "-- waiting 30 s for the event (expect none):"
"$LAB_ENV_DIR/await-event.sh" $T "$TAG" 30 || echo "no event (as expected)"
echo "-- RepAgent view from ASE:"
echo "sp_help_rep_agent phoenix_test, 'process'
go" | ase_admin | sed -n 1,5p

echo "== 3. resume and measure the delay"
start=$(date +%s)
curl -fsS -X PUT "$CONNECT_URL/connectors/$CONNECTOR_NAME/resume"
"$LAB_ENV_DIR/await-event.sh" $T "$TAG" 180
echo "-- delivered $(( $(date +%s) - start )) s after resume"
