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
        String xid = c.tranId() == null ? "" : HexFormat.of().formatHex(c.tranId());
        switch (c.kind()) {
            case BEGIN -> {
                Open o = new Open();
                o.user = c.user();
                open.put(xid, o);
            }
            case INSERT, UPDATE, DELETE -> {
                // A missing BEGIN happens when RepAgent restarts inside a transaction's span; keep the rows anyway.
                Open o = open.computeIfAbsent(xid, k -> new Open());
                o.changes.add(c);
                if (!o.warned && o.changes.size() >= warnRowsPerTxn) {
                    o.warned = true;
                    log.warn("Transaction {} holds {} rows in memory (large transaction)", xid, o.changes.size());
                }
            }
            case COMMIT -> {
                Open o = open.remove(xid);
                List<LtlCommand> rows = o == null ? List.of() : o.changes;
                lastCommitOqid = c.oqid();
                return Optional.of(new CommittedTransaction(xid, c.oqid(), c.originTime(), o == null ? null : o.user, rows));
            }
            case ROLLBACK -> {
                Open o = open.remove(xid);
                if (o != null && !o.changes.isEmpty()) log.debug("Rolled back {} discarding {} rows", xid, o.changes.size());
            }
            case OTHER -> log.debug("Ignoring LTL command: {}", c.raw());
        }
        return Optional.empty();
    }

    public int openTransactions() {
        return open.size();
    }

    public byte[] lastCommitOqid() {
        return lastCommitOqid;
    }

    /** Called when RepAgent reconnects: it re-sends everything after the truncation point. */
    public void clear() {
        open.clear();
    }
}
