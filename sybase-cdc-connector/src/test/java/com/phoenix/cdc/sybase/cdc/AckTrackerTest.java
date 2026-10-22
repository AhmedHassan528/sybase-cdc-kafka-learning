package com.phoenix.cdc.sybase.cdc;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AckTrackerTest {

    @Test
    void watermarkOnlyMovesWhenEverythingBeforeIsAcked() {
        AckTracker t = new AckTracker(null);
        byte[] a = {1}, b = {2}, c = {3};
        AckTracker.Pending pa = t.register(a, 2);
        AckTracker.Pending pb = t.register(b, 1);
        t.register(c, 0);                 // transaction without records for Kafka

        t.ack(pb);                        // later transaction acked first
        assertNull(t.acked());
        t.ack(pa);
        assertNull(t.acked());            // a still has one record in flight
        t.ack(pa);
        assertArrayEquals(c, t.acked());  // a, b and the empty c are all done
    }
}
