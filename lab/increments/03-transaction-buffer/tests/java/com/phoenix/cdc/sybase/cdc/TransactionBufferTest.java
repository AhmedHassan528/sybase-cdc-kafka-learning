package com.phoenix.cdc.sybase.cdc;

import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlCommand.Kind;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Increment 3: the transaction buffer (class TransactionBuffer).
 *
 * RepAgent sends the changes of a transaction as they are logged, before anyone knows whether the transaction will
 * commit, and transactions from different sessions are interleaved. The buffer holds the rows of each transaction
 * and releases them only at COMMIT. In the lab (evidence 23) a rolled-back row never reached Kafka because of this.
 */
class TransactionBufferTest {

    /** A command of the given kind in transaction `xid`, with a log position `oqid` and a row id equal to the oqid. */
    private static LtlCommand cmd(Kind kind, int xid, int oqid) {
        return cmd(kind, xid, oqid, "u");
    }

    private static LtlCommand cmd(Kind kind, int xid, int oqid, String user) {
        return new LtlCommand(kind, kind == Kind.COMMIT ? "20261020 13:45:56" : null, new byte[] {0, (byte) oqid}, new byte[] {(byte) xid},
            "dbo", "t", null, kind == Kind.INSERT ? Map.of("id", (long) oqid) : null, List.of("id"), null, user, "");
    }

    private static List<Object> ids(CommittedTransaction tx) {
        return tx.changes().stream().map(c -> (Object) c.after().get("id")).toList();
    }

    @Test
    void checkpoint1_rowsAreHeldUntilCommit() {
        TransactionBuffer b = new TransactionBuffer(1000);
        assertTrue(b.accept(cmd(Kind.BEGIN, 1, 1)).isEmpty(), "BEGIN releases nothing");
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 2)).isEmpty(), "a row change releases nothing before COMMIT");
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 3)).isEmpty());
        assertEquals(1, b.openTransactions());

        Optional<CommittedTransaction> tx = b.accept(cmd(Kind.COMMIT, 1, 4));
        assertTrue(tx.isPresent(), "COMMIT releases the transaction");
        assertEquals(List.of(2L, 3L), ids(tx.get()), "the rows come out in the order they were logged");
        assertEquals(0, b.openTransactions(), "a committed transaction is no longer open");
    }

    @Test
    void checkpoint2_rollbackDiscardsTheRows() {
        TransactionBuffer b = new TransactionBuffer(1000);
        b.accept(cmd(Kind.BEGIN, 1, 1));
        b.accept(cmd(Kind.INSERT, 1, 2));
        assertTrue(b.accept(cmd(Kind.ROLLBACK, 1, 3)).isEmpty(), "ROLLBACK releases nothing");
        assertEquals(0, b.openTransactions(), "a rolled-back transaction is forgotten");
    }

    @Test
    void checkpoint3_interleavedTransactionsStaySeparate() {
        TransactionBuffer b = new TransactionBuffer(1000);
        assertTrue(b.accept(cmd(Kind.BEGIN, 1, 1)).isEmpty());
        assertTrue(b.accept(cmd(Kind.BEGIN, 2, 2)).isEmpty());
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 3)).isEmpty());
        assertTrue(b.accept(cmd(Kind.INSERT, 2, 4)).isEmpty());   // interleaved with transaction 1
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 5)).isEmpty());
        assertTrue(b.accept(cmd(Kind.ROLLBACK, 2, 6)).isEmpty());
        Optional<CommittedTransaction> tx = b.accept(cmd(Kind.COMMIT, 1, 7));
        assertTrue(tx.isPresent());
        assertEquals(List.of(3L, 5L), ids(tx.get()), "only the rows of transaction 1; the rolled-back row 4 is gone");
        assertEquals(0, b.openTransactions());
    }

    @Test
    void checkpoint4_theCommitCarriesPositionTimeAndUser() {
        TransactionBuffer b = new TransactionBuffer(1000);
        b.accept(cmd(Kind.BEGIN, 1, 1, "alice"));
        b.accept(cmd(Kind.INSERT, 1, 2));
        CommittedTransaction tx = b.accept(cmd(Kind.COMMIT, 1, 9)).orElseThrow();

        assertArrayEquals(new byte[] {0, 9}, tx.commitOqid(), "the position of a transaction is the oqid of its COMMIT");
        assertEquals("20261020 13:45:56", tx.commitTime(), "the commit time is the origin time of the COMMIT command");
        assertEquals("alice", tx.user(), "the user comes from the BEGIN command");
        assertEquals("01", tx.tranId(), "the transaction id is the lower-case hex text of the id bytes");
        assertArrayEquals(new byte[] {0, 9}, b.lastCommitOqid(), "the buffer remembers the position of the last commit");
    }

    @Test
    void checkpoint5_rowsWithoutABeginAreKept() {
        // When RepAgent restarts inside a transaction's span, the BEGIN was sent in an earlier connection.
        TransactionBuffer b = new TransactionBuffer(1000);
        b.accept(cmd(Kind.INSERT, 7, 2));
        b.accept(cmd(Kind.INSERT, 7, 3));
        CommittedTransaction tx = b.accept(cmd(Kind.COMMIT, 7, 4)).orElseThrow();
        assertEquals(List.of(2L, 3L), ids(tx), "the rows are kept even though no BEGIN was seen");
        assertNull(tx.user(), "no BEGIN, so the user is unknown");
    }

    @Test
    void checkpoint6_aCommitWithoutRowsStillAdvancesThePosition() {
        // Transactions that touch only tables we do not publish, or only already-forgotten rows, still commit.
        TransactionBuffer b = new TransactionBuffer(1000);
        Optional<CommittedTransaction> tx = b.accept(cmd(Kind.COMMIT, 9, 5));
        assertTrue(tx.isPresent(), "a COMMIT is always reported, so the caller can move its position");
        assertTrue(tx.get().changes().isEmpty());
        assertArrayEquals(new byte[] {0, 5}, b.lastCommitOqid());
    }

    @Test
    void checkpoint7_otherCommandsAreIgnoredAndClearForgetsOpenTransactions() {
        TransactionBuffer b = new TransactionBuffer(1000);
        b.accept(cmd(Kind.BEGIN, 1, 1));
        b.accept(cmd(Kind.INSERT, 1, 2));
        assertTrue(b.accept(cmd(Kind.OTHER, 1, 3)).isEmpty(), "commands we do not use are ignored");
        assertEquals(1, b.openTransactions());

        b.clear();   // RepAgent reconnected: it will send everything after the truncation point again
        assertEquals(0, b.openTransactions());
        CommittedTransaction tx = b.accept(cmd(Kind.COMMIT, 1, 4)).orElseThrow();
        assertTrue(tx.changes().isEmpty(), "after clear() the earlier rows must not come back");
    }
}
