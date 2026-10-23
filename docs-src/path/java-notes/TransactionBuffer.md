---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/cdc/TransactionBuffer.java
---
purpose
  RepAgent sends the changes of a transaction as they are logged, before anyone knows whether the transaction will commit, and changes of different transactions are interleaved. TransactionBuffer holds each transaction's rows under its id until that transaction's COMMIT arrives, and then releases the whole transaction at once. A ROLLBACK throws the rows away. This is why a rolled-back row never reaches Kafka.

class: TransactionBuffer
  The buffer. It keeps a map of open transactions and the position of the last commit it saw. It is not thread-safe, on purpose: only the single RepAgent session thread feeds it (the class comment says so).

class: TransactionBuffer.Open
  A private holder for one open transaction: its list of row changes, the user from its begin command and a flag that remembers whether the "large transaction" warning was already logged.

method: TransactionBuffer.<init>(int)
  Stores the number of rows after which a transaction counts as large. It is the connector's large.transaction.warn.rows setting.

method: TransactionBuffer.accept(LtlCommand)
  Feeds one command and returns the finished transaction if the command was its COMMIT, otherwise an empty result. A BEGIN opens a transaction and remembers its user. An INSERT, UPDATE or DELETE is added to its transaction (if the begin was missed, because RepAgent restarted inside the transaction, a transaction is created on the spot and the rows are kept anyway). A COMMIT removes the transaction, remembers the commit position and returns a CommittedTransaction; a commit for a transaction the buffer never saw returns an empty transaction, so the position still advances. A ROLLBACK removes the transaction and discards its rows. Anything else is only logged at debug level.

method: TransactionBuffer.openTransactions()
  The number of transactions that have begun but not finished, used for monitoring.

method: TransactionBuffer.lastCommitOqid()
  The position of the most recent commit seen, or null before the first one.

method: TransactionBuffer.clear()
  Forgets all open transactions. The task calls it when RepAgent connects and when it disconnects, because after a reconnect RepAgent sends everything again from the truncation point, including transactions that were half-way through.

method: TransactionBuffer.Open.<init>()
  The implicit constructor of the holder; it starts with an empty list of changes.

lines: 41
  The transaction id as hexadecimal text is the key of the map. A command without a transaction id uses the empty string.

lines: 48-56
  A row change. The comment explains the first line: a missing begin is possible, so the buffer creates the transaction instead of dropping rows. The second part warns once when one transaction has collected as many rows as the configured limit, because all rows of an open transaction sit in memory.

lines: 57-62
  The commit: the point where uncertain rows become real. The transaction is removed from the map, and the commit position is remembered before the result is returned.

lines: 63-66
  The rollback: the transaction is removed and its rows are dropped, with a debug line saying how many.

design
  Holding the rows until the commit is the price of getting correct data: nothing is published that could still be rolled back. The cost is memory for long transactions, which is why there is a warning for large ones and a bounded queue after the buffer (the next stage of the pipeline).

env: large.transaction.warn.rows
  The number of rows that triggers the large-transaction warning (lines 52 to 55). It is a warning only: the transaction is still buffered and delivered.

fits
  The LTL session hands the parsed LtlCommand objects to its owner, and the task (SybaseCdcSourceTask) feeds each one to accept. When a commit arrives, TransactionBuffer returns a CommittedTransaction, which the task publishes. The probe tool LtlProbe uses it as well.
