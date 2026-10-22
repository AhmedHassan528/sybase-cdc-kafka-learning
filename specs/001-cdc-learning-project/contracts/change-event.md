# Contract: Change Event (what the learner sees in Kafka)

One Kafka record per row change, taken from the real output captured in
`docs/evidence/14-lab-first-event.txt` (2026-10-22). Key: the primary key as JSON, for example `{"payment_id":"1"}`.
Value: a change envelope in JSON without embedded schema.

| Field | Meaning |
|-------|---------|
| `op` | `c` (insert), `u` (update) or `d` (delete) |
| `before` | Column values before the change (update, delete); `null` for insert |
| `after` | Column values after the change (insert, update); `null` for delete |
| `source.server`, `source.db`, `source.owner`, `source.table` | Where the change happened |
| `source.xid` | Source transaction identifier (hex) |
| `source.oqid` | Origin queue id of this row change; unique and ordered, used to detect duplicates |
| `source.commit_oqid` | Origin queue id of the commit |
| `source.commit_time`, `source.user` | When and by whom the transaction committed |
| `source.seq`, `source.txn_rows` | `seq`: position of the row among the published rows of its transaction. `txn_rows`: number of rows in the whole transaction, including tables not on the include list |
| `ts_ms` | Time the connector produced the record |

Column value types seen in `docs/evidence/15-data-types.txt`: integer types, `float` and `real` are JSON numbers; `numeric`, `decimal`, `money` and `smallmoney` are strings (to keep exact digits); `bit` is 0 or 1; dates and times are ISO-8601 text; binary is base64; `NULL` is `null`. Primary key columns of type `numeric` also appear as strings, for example `"payment_id":"1"`.

## Guarantees

- Events within a transaction appear in commit order; rolled-back transactions produce none.
- Delivery is at-least-once: after a restart, a change may appear again with the same `source.oqid`.
- The field names above are final for the lab; increment 4 must reproduce this shape (tests compare to the evidence file).
