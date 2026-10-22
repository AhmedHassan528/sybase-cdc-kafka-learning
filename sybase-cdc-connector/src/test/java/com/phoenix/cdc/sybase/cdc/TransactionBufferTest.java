package com.phoenix.cdc.sybase.cdc;

import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlCommand.Kind;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TransactionBufferTest {

    private static LtlCommand cmd(Kind kind, int xid, int oqid) {
        return new LtlCommand(kind, null, new byte[] {0, (byte) oqid}, new byte[] {(byte) xid}, "dbo", "t",
            null, kind == Kind.INSERT ? Map.of("id", (long) oqid) : null, List.of("id"), null, "u", "");
    }

    @Test
    void publishesOnlyOnCommitAndDiscardsRollback() {
        TransactionBuffer b = new TransactionBuffer(1000);
        assertTrue(b.accept(cmd(Kind.BEGIN, 1, 1)).isEmpty());
        assertTrue(b.accept(cmd(Kind.BEGIN, 2, 2)).isEmpty());
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 3)).isEmpty());
        assertTrue(b.accept(cmd(Kind.INSERT, 2, 4)).isEmpty());   // interleaved with xid 1
        assertTrue(b.accept(cmd(Kind.INSERT, 1, 5)).isEmpty());
        assertTrue(b.accept(cmd(Kind.ROLLBACK, 2, 6)).isEmpty());
        Optional<CommittedTransaction> tx = b.accept(cmd(Kind.COMMIT, 1, 7));
        assertTrue(tx.isPresent());
        assertEquals(List.of(3L, 5L), tx.get().changes().stream().map(c -> c.after().get("id")).toList());
        assertEquals(0, b.openTransactions());
    }
}
