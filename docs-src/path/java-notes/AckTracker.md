---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/cdc/AckTracker.java
---
purpose
  The database may free its log only up to what Kafka really has. Kafka confirms records one at a time and, because the records of different transactions go to different topics or partitions, possibly out of order. AckTracker turns those single confirmations into one safe position: the position of the latest commit such that it and every commit before it are completely in Kafka. That position is what the connector reports to RepAgent as the truncation point.

class: AckTracker
  A queue of registered transactions plus the current safe position (the watermark). Its public methods are synchronized, because they are called from different threads: the transactions are registered and the watermark is read on the RepAgent session thread, and Kafka's confirmations arrive on the thread of the Kafka Connect worker.

class: AckTracker.Pending
  The record of one registered transaction: its commit position and how many of its records are not yet confirmed. The task keeps the handle and acknowledges each record against it.

method: AckTracker.<init>(byte[])
  Starts with the position already stored in Kafka (or null for a first start), so the watermark does not begin below what was already delivered.

method: AckTracker.register(byte[],int)
  Registers a transaction, in commit order, with the number of Kafka records it produced, and returns its handle. The queue is advanced straight away, so a transaction that produced no records counts as done at once.

method: AckTracker.ack(AckTracker.Pending)
  One record of that transaction is safely in Kafka: decrement the transaction's counter and see whether the watermark can move.

method: AckTracker.acked()
  The current watermark: the highest commit position such that it and everything before it is in Kafka, or null if nothing has been confirmed yet.

method: AckTracker.inFlight()
  How many registered transactions are not yet complete, for monitoring.

method: AckTracker.reset()
  Forgets the in-flight transactions, because after a reconnect RepAgent sends them again (this is what the comment in the file says). The task of this version does not call it.

method: AckTracker.advance()
  The rule itself: while the oldest registered transaction has no unconfirmed records left, remove it from the queue and make its commit position the new watermark. A later transaction that is complete cannot move the watermark past an earlier one that is not.

method: AckTracker.Pending.<init>(byte[],int)
  Stores the commit position and the number of records still to be confirmed.

lines: 63-67
  The whole idea in three lines. The queue is in commit order, so the watermark can only move along it from the front, one finished transaction after another. This is what makes the position safe even when Kafka confirms out of order.

design
  If the connector stops or crashes, every transaction beyond the watermark is sent again by RepAgent after the restart. The watermark therefore errs on the side of repeating: a duplicate is possible, a loss is not. Consumers can recognise a repeat by the position in each event.

fits
  SybaseCdcSourceTask registers every committed transaction here as soon as it puts it on its queue for publishing, acknowledges each record when Kafka confirms it (in its commitRecord method), and reads acked() to answer RepAgent's "get truncation". The values it handles are the commit positions of committed transactions, as raw bytes.
