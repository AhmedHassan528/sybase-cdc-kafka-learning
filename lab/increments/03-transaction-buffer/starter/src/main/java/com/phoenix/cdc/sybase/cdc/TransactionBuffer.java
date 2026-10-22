package com.phoenix.cdc.sybase.cdc;

import com.phoenix.cdc.sybase.ltl.LtlCommand;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Groups RepAgent commands by transaction id. Transactions from different
 * sessions interleave in the log, so rows are held per tran_id and released
 * only when that transaction's COMMIT arrives; ROLLBACK discards them.
 *
 * Not thread-safe: fed by the single RepAgent session thread.
 */
public final class TransactionBuffer {

    private static final Logger log = LoggerFactory.getLogger(TransactionBuffer.class);

    private static final class Open {
        final List<LtlCommand> changes = new ArrayList<>();
        String user;
        boolean warned;
    }

    private final Map<String, Open> open = new HashMap<>();
    private final int warnRowsPerTxn;
    private byte[] lastCommitOqid;

    public TransactionBuffer(int warnRowsPerTxn) {
        this.warnRowsPerTxn = warnRowsPerTxn;
    }

    /** Feeds one command; returns the finished transaction when the command is its COMMIT. */
    public Optional<CommittedTransaction> accept(LtlCommand c) {
        // TODO 1 (checkpoints 1 to 7): feed one command; return the finished transaction when it is a COMMIT.
        //   Key the open transactions by the transaction id as lower-case hex text (HexFormat.of().formatHex(c.tranId()), or ""
        //   when the id is missing). Use the `open` map and the Open class above. By c.kind():
        //   BEGIN     -> start a new Open for that id and remember the user (c.user()).
        //   INSERT / UPDATE / DELETE -> add the command to that transaction's changes. Create the Open if there is none yet:
        //                RepAgent can restart inside a transaction, so the BEGIN may have been sent in an earlier connection.
        //                When the transaction reaches `warnRowsPerTxn` rows, log one warning (use the `warned` flag).
        //   COMMIT    -> remove the Open; remember c.oqid() as the last commit position; return a CommittedTransaction with
        //                (id, c.oqid(), c.originTime(), the user or null, the rows or an empty list). A COMMIT is ALWAYS reported,
        //                even with no rows, so the caller can move its position forward.
        //   ROLLBACK  -> remove the Open and throw its rows away; return Optional.empty().
        //   OTHER     -> log at debug level and ignore.
        //   Every other case returns Optional.empty().
        throw new UnsupportedOperationException("increment 3: TransactionBuffer.accept()");
    }

    public int openTransactions() {
        // TODO 2 (checkpoints 1 to 3 and 7): how many transactions are open right now.
        throw new UnsupportedOperationException("increment 3: TransactionBuffer.openTransactions()");
    }

    public byte[] lastCommitOqid() {
        // TODO 3 (checkpoint 4): the oqid of the last COMMIT that accept() reported, or null before the first one.
        throw new UnsupportedOperationException("increment 3: TransactionBuffer.lastCommitOqid()");
    }

    /** Called when RepAgent reconnects: it re-sends everything after the truncation point. */
    public void clear() {
        // TODO 4 (checkpoint 7): RepAgent reconnected and will send everything after the truncation point again, so forget
        //   every open transaction.
        throw new UnsupportedOperationException("increment 3: TransactionBuffer.clear()");
    }
}
