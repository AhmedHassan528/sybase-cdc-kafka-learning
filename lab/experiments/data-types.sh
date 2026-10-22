#!/usr/bin/env bash
# Data types experiment: how each common ASE type appears in the Kafka event.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
ase_sql < "$LAB_ENV_DIR/types.sql" >/dev/null
"$LAB_ENV_DIR/set-tables.sh" payment,customer,ltl_types
ase_app >/dev/null <<'SQL'
insert ltl_types values (1, 255, -32768, 9223372036854775807, 1, 12345.6789, 42, 1234.5678, -12.34,
  3.14159265358979, 2.5, 'abc', 'it''s "quoted"', 'uni', '2026-10-20 13:45:56.123', '2026-10-20 13:45',
  '2026-10-20', '13:45:56', '2026-10-20 13:45:56.123456', 0x01020304, 0xdeadbeef)
go
insert ltl_types (id) values (2)
go
update ltl_types set c_money = 99.99, c_vchar = 'updated' where id = 1
go
SQL
sleep 8
TOPIC=sybase.phoenix_test.ltl_types "$LAB_ENV_DIR/consume.sh" | sed -E 's/"source":\{[^}]*\},//'
