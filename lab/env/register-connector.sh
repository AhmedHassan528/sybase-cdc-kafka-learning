#!/usr/bin/env bash
# Register the connector and start the RepAgent so ASE streams changes to it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

if curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME" >/dev/null 2>&1; then
  echo "connector $CONNECTOR_NAME already registered"
else
  curl -fsS -X POST -H 'Content-Type: application/json' --data @"$LAB_ROOT/connectors/sybase-cdc-phoenix.json" "$CONNECT_URL/connectors" >/dev/null
  echo "registered $CONNECTOR_NAME"
fi
wait_for "connector task RUNNING" 60 bash -c "curl -fsS $CONNECT_URL/connectors/$CONNECTOR_NAME/status | grep -q '\"state\":\"RUNNING\"'"

# The RepAgent must start only after the connector listens (first time only; later boots auto-start).
# retry timeout 10: reconnect sooner than the 60 s default after a connector restart (see "Why is there no data?").
ase_admin <<'SQL' || true
sp_config_rep_agent phoenix_test, 'retry timeout', '10'
go
sp_start_rep_agent phoenix_test
go
SQL
curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/status"; echo
