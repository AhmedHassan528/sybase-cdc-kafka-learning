#!/usr/bin/env bash
# Edge case: the SOURCE database restarts while a verification step is waiting.
#
# EXPECTED (written before the first run): a row written before the restart (TAG-1) is in Kafka once. While ASE is down, the
# connector keeps running and the RepAgent is gone with ASE. ASE starts the RepAgent again by itself after it is back (its
# auto-start setting), the row written afterwards (TAG-2) arrives, and the wait that was started BEFORE the restart ends with
# success after ASE came back; it never hangs: it ends either with the row or with its own TIMEOUT message within its limit.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env/_common.sh"
T=sybase.phoenix_test.payment
TAG=SR$(date +%H%M%S)
LIMIT=300

row() { ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-$1', $1, 'EUR')
go
SQL
}
ase_up() { printf 'select 1\ngo\n' | ase_app >/dev/null 2>&1; }

echo "== 1. a row before the restart ($TAG-1) and wait for it"
row 1
"$LAB_ENV_DIR/await-event.sh" $T "$TAG-1" 200 >/dev/null && echo "ok: $TAG-1 reached Kafka" || echo "TIMEOUT: $TAG-1 never arrived"

echo "== 2. start a wait for the NEXT row ($TAG-2, not written yet), limit ${LIMIT}s, in the background"
start=$(date +%s)
( "$LAB_ENV_DIR/await-event.sh" $T "$TAG-2" $LIMIT > /tmp/sr-wait.out 2>&1; echo "rc=$?" >> /tmp/sr-wait.out ) &
waiter=$!

echo "== 3. restart ASE while that wait is running"
docker restart "$ASE" >/dev/null
echo "ASE container restarted; waiting for it to accept logins"
t=0; until ase_up; do t=$((t + 3)); [ $t -ge 240 ] && { echo "TIMEOUT: ASE did not come back in 240 s"; break; }; sleep 3; done
echo "ASE accepts logins again $(( $(date +%s) - start )) s after the wait started"

echo "== 4. write the row after the restart ($TAG-2)"
row 2
wait "$waiter"
echo "-- the wait started before the restart ended after $(( $(date +%s) - start )) s with: $(grep -E '^rc=' /tmp/sr-wait.out) $(grep -c "$TAG-2" /tmp/sr-wait.out) matching line(s); $(grep -E 'TIMEOUT' /tmp/sr-wait.out | head -n 1)"

echo "== 5. counts for tag $TAG"
echo "ASE holds:   $(printf "select count(*) from payment where account_no like '$TAG%%'\ngo\n" | ase_app | grep -E '^ +[0-9]+ *$' | tr -d ' ') rows"
sleep 5
echo "Kafka holds: $(TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -c "\"account_no\":\"$TAG-") events (TAG-1 and TAG-2 expected once each)"
echo "-- RepAgent after the restart (sp_help_rep_agent): $(printf "sp_help_rep_agent phoenix_test, 'process'\ngo\n" | ase_admin | sed -n 4p | tr -s ' ' | cut -c1-110)"
echo "-- connector: $(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/status" | grep -o '"state":"[A-Z]*"' | head -n 2 | tr '\n' ' ')"
