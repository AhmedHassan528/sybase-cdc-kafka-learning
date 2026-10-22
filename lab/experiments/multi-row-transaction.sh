#!/usr/bin/env bash
# Reliability experiment 4: one transaction with several rows keeps its order.
#
# EXPECTED (written before the first run): the 5 events of the transaction appear in the order the statements ran
# (3 inserts, then an update, then a delete), all with the same source.xid and source.commit_oqid, with seq 0 to 4 and
# txn_rows 5.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.payment
TAG=MR$(date +%H%M%S)

ase_app >/dev/null <<SQL
begin tran
go
insert into payment (account_no, amount, currency) values ('$TAG-1', 10, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-2', 20, 'EUR')
go
insert into payment (account_no, amount, currency) values ('$TAG-3', 30, 'EUR')
go
update payment set amount = 25 where account_no = '$TAG-2'
go
delete from payment where account_no = '$TAG-1'
go
commit tran
go
SQL
KEEP_SOURCE=1 "$LAB_ENV_DIR/await-event.sh" $T "$TAG-1" 120 >/dev/null || echo "TIMEOUT: events never arrived"
sleep 6
echo "-- events of the transaction, in topic order (op, account, seq, txn_rows, xid):"
TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -F "$TAG-" | while read -r line; do
  op=$(grep -oE '"op":"[cud]"' <<<"$line" | head -1)
  acct=$(grep -oE "\"$TAG-[0-9]\"" <<<"$line" | head -1)
  seq=$(grep -oE '"seq":[0-9]+' <<<"$line"); rows=$(grep -oE '"txn_rows":[0-9]+' <<<"$line")
  xid=$(grep -oE '"xid":"[0-9a-f]+"' <<<"$line" | cut -c1-30)
  echo "$op  $acct  $seq  $rows  $xid..."
done
echo "-- distinct xid values: $(TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -F "$TAG-" | grep -oE '"xid":"[0-9a-f]+"' | sort -u | wc -l)"
