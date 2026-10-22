# Increment 3: nothing is real until COMMIT

**You build:** the `TransactionBuffer`. RepAgent sends the changes of a transaction as they are logged, before anyone
knows whether it will commit, and transactions from different sessions are interleaved. The buffer holds each
transaction's rows and releases them only at `COMMIT`; `ROLLBACK` throws them away. In the lab a rolled-back row never
reached Kafka for exactly this reason (article, "Reliability experiments").

- `TransactionBuffer` (`starter/src/main/java/com/phoenix/cdc/sybase/cdc/TransactionBuffer.java`): `accept()`,
  `openTransactions()`, `lastCommitOqid()`, `clear()`.

**Given:** `CommittedTransaction` (what you return at a commit) and `Oqid` (log position helpers), plus everything from
increments 1 and 2. `Increment3Main` feeds your buffer with the real RepAgent's commands.

## Work through the checkpoints

| Checkpoint | You make this work |
|-----------:|--------------------|
| 1 | rows are held until COMMIT, then come out in log order |
| 2 | ROLLBACK discards the rows |
| 3 | interleaved transactions stay separate |
| 4 | the commit carries its position (oqid), time and user |
| 5 | rows without a BEGIN are kept (RepAgent restarted inside a transaction) |
| 6 | a COMMIT with no rows is still reported, so the position can move on |
| 7 | other commands are ignored; `clear()` forgets open transactions |

```bash
lab/increments/03-transaction-buffer/verify.sh            # 28 tests: 21 from before + 7 new
lab/increments/03-transaction-buffer/verify.sh solution
```

Start state: the 7 new tests fail. Reference solution: all 28 pass.

## Live check against the real ASE

```bash
lab/increments/03-transaction-buffer/verify-live.sh
```

It writes one row inside a transaction that it **rolls back** and then one in a committed transaction. It passes when your
buffer reports the committed row and never the rolled-back one. Expected (reference solution):

```
[inc3] COMMITTED xid=00000000000015b000804d59... rows=1 [payment:account_no=LIVE012345-1]
PASS  03-transaction-buffer (solution): the committed row (LIVE012345-1) was released at COMMIT and the rolled-back row (LIVE012345-RB) never was
```

## Stuck?

`lab/solutions/03-transaction-buffer/`.

## Not covered

Very large transactions (the buffer holds them in memory; the original project saw the worker heap near 2 GB in a big
test). Bash only; on Windows use Git Bash.
