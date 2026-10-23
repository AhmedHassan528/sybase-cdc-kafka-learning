---
id: 7.22
stage: java
order: 22
title: How the classes work together
summary: Follow one inserted row through every class of the connector, from the database log to a Kafka event and the acknowledgement that frees the log.
objectives:
  - You can follow one change through the classes in order.
  - You can say which class makes each guarantee of the pipeline (no rolled-back rows, no lost transactions, repeats are recognisable).
  - You can match each step to something you can see in the lab.
prerequisites: [7.21]
prereqCheck: markers-before
diagrams: [connector-lifecycle]
---
## Description

This lesson ties the 20 file lessons together by following **one change**: the insert of the row `LESSON-7` into `payment`. Each step names the class that does the work and, where the lab shows it, what you can see.

{{diagram:connector-lifecycle}}

1. **The database writes the change to its log, and commits.** Nothing of the connector is involved. The row is in the log, and RepAgent, the thread you started in lesson 6.2, reads it.
2. **RepAgent sends it as LTL over the connection it opened to the connector.** `LtlServer` accepted that connection long ago and started an `LtlSession` for it. The session's `run` loop reads each message through a `TdsChannel`, which reassembles the packets, and `tokenStream` and `language` unpack the LTL text.
3. **The session parses the text.** `LtlParser` asks `LtlLexer` to cut the bytes into tokens (this is where the length-prefixed values are read) and turns them into `LtlCommand` objects: one for the begin, one for the insert and one for the commit. `LtlValues` turns the value tokens into Java values, so the amount 7.00 becomes the text 7: that is why you saw `"amount":"7"`.
4. **The session hands the commands to its owner** through `LtlListener.onCommands`, and then answers RepAgent with exactly one DONE, built by `TdsTokens` and sent by the channel. The owner is the Kafka Connect task, `SybaseCdcSourceTask`, through its inner `Listener`.
5. **The task puts each command into the `TransactionBuffer`.** The begin opens a transaction, the insert is held under its transaction id. Nothing is published yet. When the commit arrives the buffer returns a `CommittedTransaction`. (If it had been a rollback, the rows would be dropped here and never reach Kafka.)
6. **The task registers the transaction with the `AckTracker`** (one record to be confirmed) and puts a batch on its bounded queue. If a transaction with the same or an older commit position was already published before a restart, the task skips it here, comparing positions with `Oqid`.
7. **Kafka Connect calls `poll`.** The task takes the batch from the queue and, for each row, asks the `ChangeEventMapper` for the topic (`sybase.phoenix_test.payment`), the key (the primary key columns) and the value (`op`, `before`, `after`, `source`). It wraps them in a `TrackedRecord` whose offset says "this transaction is done", because it is the last row of its transaction. Connect writes the record to Kafka.
8. **Kafka acknowledges the record, and Connect calls `commitRecord`.** The task tells the `AckTracker`. The tracker's watermark moves to this transaction's commit position, if every earlier transaction is complete too.
9. **RepAgent asks "get truncation".** The session calls `truncationPoint` on the task, which answers with the watermark padded by `Oqid.locator` to 36 bytes. RepAgent moves the database's truncation point up to it, and the database may free that part of the log.

The guarantees come from different places. Rolled-back rows never reach Kafka because of **step 5**; a lost transaction cannot happen because the position reported in **step 9** only moves in **step 8**, after Kafka has the data; and a repeat after a restart can be recognised because every event carries its log position (`source.oqid`) from **step 7**.

## Steps

### 1. Where the scan is before the change

{{cmd:markers-before}}
{{out:markers-before}}

The marker columns are positions in the log and the last column before `oldest_transaction` counts the log records RepAgent has scanned. All of these numbers differ in every lab, so they are shown as placeholders.

### 2. Insert the row

{{cmd:insert}}
{{out:insert}}

This is the change followed in the steps above, made as the application account.

### 3. The event arrives

{{cmd:event}}
{{out:event}}

The line is the Kafka message as the consumer helper prints it: the key `{"payment_id":...}` (the primary key, step 7), a bar, and the value with `op c`, `before null`, the `after` row and a timestamp. The `source` block with the positions is left out by this helper. The amount is `"7"`, the text form of 7.00 (the value conversion of step 3). The id, the creation time and `ts_ms` differ in every lab and are shown as placeholders.

### 4. Where the scan is after the change

{{cmd:markers-after}}
{{out:markers-after}}

The positions and the counter moved forward: RepAgent read the new log records of the insert and sent them (steps 2 to 4).

### 5. The stored restart position

{{cmd:stored-position}}
{{out:stored-position}}

Kafka Connect stores the connector's restart position in its internal offsets topic. The key names the connector, the database and the server (`SybaseCdcConfig.sourcePartition` builds it, with the database first), and the value is the commit position of the last transaction acknowledged by Kafka (step 8): the position the task would resume from. The long hexadecimal number changes with every change, so it is shown as a placeholder.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- The steps that leave no visible trace in the lab (the packet reassembly, the lexer, the buffer and the tracker): they are described from the code and its notes, and are covered by the build-along's unit tests (evidence 35), not by this lesson.
- A rolled-back transaction in this lesson (evidence 23 recorded it earlier: no event for a rolled-back row).
- A restart in the middle of a transaction.
