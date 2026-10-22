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
        this.acked = initial;
    }

    /** Register a transaction (in commit order) that produced {@code records} Kafka records. */
    public synchronized Pending register(byte[] commitOqid, int records) {
        Pending p = new Pending(commitOqid, records);
        queue.addLast(p);
        advance();
        return p;
    }

    /** One record of that transaction is safely in Kafka. */
    public synchronized void ack(Pending p) {
        p.remaining--;
        advance();
    }

    /** Highest commit OQID such that it and everything before it is in Kafka (null if none yet). */
    public synchronized byte[] acked() {
        return acked;
    }

    public synchronized int inFlight() {
        return queue.size();
    }

    /** Forget in-flight transactions (RepAgent will re-send them after a reconnect). */
    public synchronized void reset() {
        queue.clear();
    }

    private void advance() {
        while (!queue.isEmpty() && queue.peekFirst().remaining <= 0) {
            acked = queue.pollFirst().oqid;
        }
    }
}
