#!/usr/bin/env bash
# Change which tables the connector captures. Usage: set-tables.sh payment,customer
# The task restarts and closes the RepAgent connection. ASE notices only when it next has something
# to send, then reconnects after its retry timeout. So the next change you make is delayed by that retry;
# use await-event.sh to wait for it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
list=${1:?usage: set-tables.sh table1,table2}
# Input validation: only comma-separated table names (letters, digits, underscore). The list ends up in JSON and sed.
[[ "$list" =~ ^[A-Za-z0-9_]+(,[A-Za-z0-9_]+)*$ ]] || { echo "invalid table list: use names separated by commas, for example payment,customer" >&2; exit 2; }

cfg=$(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/config")
current=$(printf '%s' "$cfg" | sed -E 's/.*"table.include.list":"([^"]*)".*/\1/')
if [ "$current" = "$list" ]; then echo "table.include.list is already $list; nothing to do"; exit 0; fi

listening=$(docker logs "$CONNECT" 2>&1 | grep -c 'LTL server listening' || true)
new=$(printf '%s' "$cfg" | sed -E "s/\"table.include.list\":\"[^\"]*\"/\"table.include.list\":\"$list\"/")
curl -fsS -X PUT -H 'Content-Type: application/json' --data "$new" "$CONNECT_URL/connectors/$CONNECTOR_NAME/config" >/dev/null

wait_for "new task listening" 90 bash -c "[ \$(docker logs $CONNECT 2>&1 | grep -c 'LTL server listening') -gt $listening ]"
echo "table.include.list = $list"
