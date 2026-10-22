package com.phoenix.cdc.sybase.cdc;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Turns per-record Kafka acknowledgements into a safe log position.
 *
 * Records of different transactions go to different topics/partitions, so
 * Kafka can confirm them out of order. A transaction counts as done only when
 * all of its records are acknowledged, and the watermark only moves past a
 * transaction when every earlier transaction is done too. That watermark is
 * what we hand RepAgent as the truncation point, so ASE never frees log that
 * has not reached Kafka.
 */
public final class AckTracker {

    public static final class Pending {
        final byte[] oqid;
        int remaining;

        Pending(byte[] oqid, int remaining) {
            this.oqid = oqid;
            this.remaining = remaining;
        }
    }

    private final Deque<Pending> queue = new ArrayDeque<>();
    private byte[] acked;

    public AckTracker(byte[] initial) {
        // TODO 1 (checkpoint 4): remember the starting position (the position stored by an earlier run, or null) as the
        //   current watermark `acked`.
        throw new UnsupportedOperationException("increment 5: AckTracker()");
    }

    /** Register a transaction (in commit order) that produced {@code records} Kafka records. */
    public synchronized Pending register(byte[] commitOqid, int records) {
        // TODO 2 (checkpoints 1 to 4): a transaction was committed and produced `records` Kafka records.
        //   Create a Pending for it, add it at the END of the queue (transactions are registered in commit order), move the
        //   watermark forward if it can move (advance()), and return the Pending.
        throw new UnsupportedOperationException("increment 5: AckTracker.register()");
    }

    /** One record of that transaction is safely in Kafka. */
    public synchronized void ack(Pending p) {
        // TODO 3 (checkpoints 2 and 3): Kafka confirmed one record of that transaction: count it down, then advance().
        throw new UnsupportedOperationException("increment 5: AckTracker.ack()");
    }

    /** Highest commit OQID such that it and everything before it is in Kafka (null if none yet). */
    public synchronized byte[] acked() {
        // TODO 4: the current watermark (null if nothing has been confirmed and there was no starting position).
        throw new UnsupportedOperationException("increment 5: AckTracker.acked()");
    }

    public synchronized int inFlight() {
        // TODO 5 (checkpoint 5): how many registered transactions are not done yet.
        throw new UnsupportedOperationException("increment 5: AckTracker.inFlight()");
    }

    /** Forget in-flight transactions (RepAgent will re-send them after a reconnect). */
    public synchronized void reset() {
        // TODO 6 (checkpoint 6): forget the transactions in flight; keep the watermark.
        throw new UnsupportedOperationException("increment 5: AckTracker.reset()");
    }

    private void advance() {
        // TODO 7 (checkpoints 1 to 3): the heart of the class. While the transaction at the FRONT of the queue has no records
        //   left to confirm, remove it and make its commit oqid the new watermark. Stop at the first transaction that still
        //   waits: a later transaction that is already done must not move the watermark past it.
        throw new UnsupportedOperationException("increment 5: AckTracker.advance()");
    }
}
