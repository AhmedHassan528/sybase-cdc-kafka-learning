package com.phoenix.cdc.sybase.cdc;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Increment 5: the acknowledgement tracker (class AckTracker).
 *
 * Kafka confirms records one by one, and records of different transactions can be confirmed out of order. The position
 * we tell ASE ("you may free your log up to here") must never pass a transaction that Kafka has not fully confirmed.
 * That position is called the watermark; it is the commit oqid of the newest transaction such that it AND everything
 * before it is confirmed. In the lab (evidence 26) a crash right after publishing made ASE send rows again, because the
 * position that had been saved was older than what was published: duplicates, never losses.
 */
class AckTrackerTest {

    private static final byte[] A = {1}, B = {2}, C = {3}, START = {0, 9};

    @Test
    void checkpoint1_aTransactionWithoutRecordsIsDoneAtOnce() {
        AckTracker t = new AckTracker(null);
        t.register(A, 0);   // e.g. a transaction that only touched tables we do not publish
        assertArrayEquals(A, t.acked(), "nothing to wait for, so the position can move on immediately");
        assertEquals(0, t.inFlight());
    }

    @Test
    void checkpoint2_aTransactionIsDoneWhenAllItsRecordsAreConfirmed() {
        AckTracker t = new AckTracker(null);
        AckTracker.Pending p = t.register(A, 2);
        assertNull(t.acked(), "registered, but nothing confirmed yet");
        t.ack(p);
        assertNull(t.acked(), "one of two records is still in flight");
        t.ack(p);
        assertArrayEquals(A, t.acked());
    }

    @Test
    void checkpoint3_theWatermarkOnlyMovesWhenEverythingBeforeIsConfirmed() {
        AckTracker t = new AckTracker(null);
        AckTracker.Pending pa = t.register(A, 2);
        AckTracker.Pending pb = t.register(B, 1);
        t.register(C, 0);                 // a transaction without records for Kafka

        t.ack(pb);                        // the later transaction is confirmed first
        assertNull(t.acked(), "B is confirmed but A, before it, is not");
        t.ack(pa);
        assertNull(t.acked(), "A still has one record in flight");
        t.ack(pa);
        assertArrayEquals(C, t.acked(), "A, B and the empty C are all done: the watermark jumps to C");
    }

    @Test
    void checkpoint4_theStartingPositionStaysUntilSomethingNewIsDone() {
        AckTracker t = new AckTracker(START);   // the position stored by an earlier run
        assertArrayEquals(START, t.acked(), "before anything new is confirmed we still report the stored position");
        AckTracker.Pending p = t.register(A, 1);
        assertArrayEquals(START, t.acked());
        t.ack(p);
        assertArrayEquals(A, t.acked());
    }

    @Test
    void checkpoint5_inFlightCountsTheTransactionsNotYetDone() {
        AckTracker t = new AckTracker(null);
        AckTracker.Pending pa = t.register(A, 1);
        AckTracker.Pending pb = t.register(B, 1);
        assertEquals(2, t.inFlight());
        t.ack(pa);
        assertEquals(1, t.inFlight());
        t.ack(pb);
        assertEquals(0, t.inFlight());
    }

    @Test
    void checkpoint6_resetForgetsTransactionsInFlight() {
        // RepAgent reconnected: it will send the unconfirmed transactions again, so we must not wait for the old ones.
        AckTracker t = new AckTracker(START);
        t.register(A, 1);
        t.reset();
        assertEquals(0, t.inFlight());
        assertArrayEquals(START, t.acked(), "the position already confirmed is kept");
    }
}
