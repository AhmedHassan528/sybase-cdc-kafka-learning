#!/usr/bin/env bash
# Edge case: an UPDATE that changes the primary key.
#
# EXPECTED (written before the first run): table ltl_types has a plain int primary key `id` (not an identity column, so it can
# be updated). Changing id from OLD to NEW produces ONE event with op u whose before image has id OLD and whose after image has
# id NEW, and the Kafka record key is taken from the after image: {"id":NEW}. So a consumer that keys its state by id sees the
# update under the NEW key and never gets a delete for the OLD key. (If ASE logs the change as a delete plus an insert, there
# would be two events instead; this script prints whatever arrives.)
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
T=sybase.phoenix_test.ltl_types
TAG=KC$(date +%H%M%S)
OLD=$(( $(date +%s) % 90000 + 1000 ))
NEW=$(( OLD + 1 ))

# the table (created by types.sql, which also grants cdc_app) and its topic
if printf 'select count(*) from ltl_types\ngo\n' | ase_app 2>&1 | grep -q 'Msg [0-9]'; then ase_sql < "$LAB_ENV_DIR/types.sql" >/dev/null; fi   # isql exits 0 on an SQL error, so look at its answer
cur=$(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/config" | sed -E 's/.*"table.include.list":"([^"]*)".*/\1/')
case ",$cur," in
  *,ltl_types,*) ;;                                                   # already captured
  *) "$LAB_ENV_DIR/set-tables.sh" "${cur:+$cur,}ltl_types" ;;         # add it to the include list
esac

echo "== insert id=$OLD, then change its primary key to $NEW (tag $TAG)"
ase_app >/dev/null <<SQL
insert into ltl_types (id, c_vchar) values ($OLD, '$TAG-before')
go
update ltl_types set id = $NEW, c_vchar = '$TAG-after' where id = $OLD
go
SQL
echo "-- ASE now holds:"
printf 'select id, c_vchar from ltl_types where c_vchar like '"'"'%s%%'"'"'\ngo\n' "$TAG" | ase_app

"$LAB_ENV_DIR/await-event.sh" $T "\"c_vchar\":\"$TAG-after\"" 240 >/dev/null || { echo "TIMEOUT: the update event never arrived"; exit 1; }
sleep 4
echo "-- events on $T for this run (key | op | before.id | after.id):"
TOPIC=$T "$LAB_ENV_DIR/consume.sh" "$T" 6000 | grep -F "$TAG" | while IFS= read -r line; do
  key=${line%% | *}
  op=$(grep -oE '"op":"[cud]"' <<<"$line" | head -n 1 | cut -d'"' -f4)
  bid=$(grep -oE '"before":\{"id":[0-9]+' <<<"$line" | grep -oE '[0-9]+$')
  aid=$(grep -oE '"after":\{"id":[0-9]+' <<<"$line" | grep -oE '[0-9]+$')
  echo "$key | op=$op | before.id=${bid:-null} | after.id=${aid:-null}"
done
echo "-- expected key after the change: {\"id\":$NEW}; old id: $OLD"
