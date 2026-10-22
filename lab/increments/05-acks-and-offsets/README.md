# Increment 5: telling ASE what is safe to forget

**The problem.** ASE keeps its transaction log until the connector says "I have this safely, you can free it". Say it too
early and a crash loses changes; say it late and the log grows. Kafka confirms records one by one, and records of
different transactions can be confirmed out of order, so the position we report must never pass a transaction Kafka has
not fully confirmed.

**You build:** the `AckTracker`, which turns per-record confirmations into that safe position (the *watermark*).

- `AckTracker` (`starter/src/main/java/com/phoenix/cdc/sybase/cdc/AckTracker.java`): the constructor, `register()`,
  `ack()`, `acked()`, `inFlight()`, `reset()` and the heart of it, `advance()`.

**Given:** `AckTracker.Pending`, everything from increments 1 to 4, and `Increment5Main`, which contains a fake Kafka that
confirms records after a delay. In Increment 6 the real Kafka Connect does this and stores the position for restarts.

## Work through the checkpoints

| Checkpoint | You make this work |
|-----------:|--------------------|
| 1 | a transaction with no records for Kafka is done at once |
| 2 | a transaction is done when all of its records are confirmed |
| 3 | the watermark moves only when everything before is confirmed (the one that matters) |
| 4 | the starting position (stored by an earlier run) is kept until something new is done |
| 5 | `inFlight()` counts the transactions not yet done |
| 6 | `reset()` forgets what is in flight but keeps the watermark |

```bash
lab/increments/05-acks-and-offsets/verify.sh            # 42 tests: 36 from before + 6 new
lab/increments/05-acks-and-offsets/verify.sh solution
```

Start state: the 6 new tests fail. Reference solution: all 42 pass.

## Live check against the real ASE

```bash
lab/increments/05-acks-and-offsets/verify-live.sh
```

It writes two committed rows, `...-1` then `...-2`, each in its own transaction. The fake Kafka confirms the `-2`
transaction after 0.3 s but the `-1` transaction only after 4 s. It passes when your watermark does **not** move to `-2`
while `-1` is unconfirmed, and jumps to `-2` once `-1` is confirmed. Expected (reference solution):

```
[inc5] confirmed commit_oqid=...001a... watermark=null                      <- the -2 transaction: the older one is still waiting
[inc5] confirmed commit_oqid=...0017... watermark=...001a...                <- the -1 transaction: now the watermark jumps to -2
PASS  05-acks-and-offsets (solution): the watermark waited for the older transaction, then jumped to the newer one
```

## Stuck?

`lab/solutions/05-acks-and-offsets/`.

## Not covered

How the position survives a restart (Connect stores it under the key you saw in the article's "Resetting and restarting"
section) is part of increment 6. Bash only; on Windows use Git Bash.
