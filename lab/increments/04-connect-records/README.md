# Increment 4: the event Kafka sees

**You build:** the `ChangeEventMapper`, which turns a committed row change into what goes to Kafka: the topic, the key
and the value. This is the shape consumers read (article, "Message keys and topic naming" and "Data types").

- `ChangeEventMapper` (`starter/src/main/java/com/phoenix/cdc/sybase/connect/ChangeEventMapper.java`): the constructor,
  `topic()`, `key()`, `value()`.

**Given:** `SybaseCdcConfig` (the connector's settings), everything from increments 1 to 3, and `Increment4Main`, which
prints what your mapper builds for each committed row. The Kafka Connect API (`connect-api`) is on the classpath; this
increment only builds the plain maps that Connect's JSON converter writes out.

## Work through the checkpoints

| Checkpoint | You make this work |
|-----------:|--------------------|
| 1 | topic = `<prefix>.<database>.<table>` |
| 2 | key = the primary key columns (from the after image, or the before image for a delete) |
| 3 | a table without a key gets no key |
| 4 | insert: `op` is `c`, no `before` |
| 5 | update: `u` with both images; delete: `d` with no `after` |
| 6 | a command that is not a row change is refused |
| 7 | the `source` block: server, db, owner, table, xid, oqid, commit_oqid, commit_time, user, seq, txn_rows |
| 8 | the fields come out in the documented order, with `ts_ms` last |

The expected shape is the one in `specs/001-cdc-learning-project/contracts/change-event.md`, taken from the real events in
`docs/evidence/14-lab-first-event.txt`.

```bash
lab/increments/04-connect-records/verify.sh            # 36 tests: 28 from before + 8 new
lab/increments/04-connect-records/verify.sh solution
```

Start state: the 8 new tests fail. Reference solution: all 36 pass.

## Live check against the real ASE

```bash
lab/increments/04-connect-records/verify-live.sh
```

It writes one row as the login `cdc_app` and passes when the line your code prints has the right topic, key, op, after
image and source block. Expected (reference solution, shortened):

```
[inc4] topic=sybase.phoenix_test.payment key={payment_id=19} value={op=c, before=null, after={payment_id=19, account_no=LIVE013014-1, ...}, source={server=MYSYBASE, db=phoenix_test, owner=dbo, table=payment, xid=..., user=cdc_app, seq=0, txn_rows=1}, ts_ms=...}
PASS  04-connect-records (solution): your mapper built the event for the row we just wrote (LIVE013014-1) from the real RepAgent's changes
```

## Stuck?

`lab/solutions/04-connect-records/`.

## Not covered

The JSON text itself is written by Kafka Connect's JSON converter; this increment checks your maps, and increment 6 shows
the JSON in Kafka. Bash only; on Windows use Git Bash.
