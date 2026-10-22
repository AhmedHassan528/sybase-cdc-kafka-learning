package com.phoenix.cdc.sybase.connect;

import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.ltl.LtlCommand;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Builds the change event (schemaless; use JsonConverter with schemas.enable=false):
 *
 * <pre>
 * key:   {"payment_id": "500000000000002"}                (primary key columns flagged by RepAgent)
 * value: {"op": "c|u|d", "before": {...}|null, "after": {...}|null,
 *         "source": {"server", "db", "owner", "table", "xid", "oqid", "commit_oqid",
 *                    "commit_time", "user", "seq", "txn_rows"},
 *         "ts_ms": 1760990000000}
 * </pre>
 * Consumers can de-duplicate on source.oqid (unique per row change, increasing in log order).
 */
final class ChangeEventMapper {

    private final String server;
    private final String database;
    private final String topicPrefix;

    ChangeEventMapper(String server, String database, String topicPrefix) {
        // TODO 1: keep the three values in the fields above.
        throw new UnsupportedOperationException("increment 4: ChangeEventMapper()");
    }

    String topic(LtlCommand c) {
        // TODO 2 (checkpoint 1): the topic is <topicPrefix>.<database>.<table>, for example sybase.phoenix_test.payment.
        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.topic()");
    }

    Map<String, Object> key(LtlCommand c) {
        // TODO 3 (checkpoints 2 and 3): the key holds the primary key columns (c.keyColumns()) with their values, in that order
        //   (use a LinkedHashMap). Take the values from the after image, or from the before image when there is no after
        //   image (a delete). A table with no key columns gets no key: return null.
        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.key()");
    }

    Map<String, Object> value(LtlCommand c, CommittedTransaction tx, int seq) {
        // TODO 4 (checkpoints 4 to 8): build the value as a LinkedHashMap with the keys in THIS order:
        //   op       "c" for INSERT, "u" for UPDATE, "d" for DELETE; any other kind: throw IllegalArgumentException
        //   before   c.before()        (null when the command has none)
        //   after    c.after()
        //   source   a LinkedHashMap, in this order:
        //              server (the field), db (the field `database`), owner (c.owner()), table (c.table()),
        //              xid (tx.tranId()), oqid (Oqid.hex(c.oqid())), commit_oqid (Oqid.hex(tx.commitOqid())),
        //              commit_time (tx.commitTime()), user (tx.user()),
        //              seq (the argument, as a long: it is this row's position in the transaction),
        //              txn_rows (tx.changes().size(), as a long)
        //   ts_ms    System.currentTimeMillis()
        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.value()");
    }
}
