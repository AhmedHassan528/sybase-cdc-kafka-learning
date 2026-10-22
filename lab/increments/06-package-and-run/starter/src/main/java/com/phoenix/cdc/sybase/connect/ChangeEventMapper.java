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
        this.server = server;
        this.database = database;
        this.topicPrefix = topicPrefix;
    }

    String topic(LtlCommand c) {
        return topicPrefix + "." + database + "." + c.table();
    }

    Map<String, Object> key(LtlCommand c) {
        if (c.keyColumns().isEmpty()) return null;
        Map<String, Object> row = c.after() != null ? c.after() : c.before();
        Map<String, Object> k = new LinkedHashMap<>();
        for (String col : c.keyColumns()) k.put(col, row.get(col));
        return k;
    }

    Map<String, Object> value(LtlCommand c, CommittedTransaction tx, int seq) {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("server", server);
        source.put("db", database);
        source.put("owner", c.owner());
        source.put("table", c.table());
        source.put("xid", tx.tranId());
        source.put("oqid", Oqid.hex(c.oqid()));
        source.put("commit_oqid", Oqid.hex(tx.commitOqid()));
        source.put("commit_time", tx.commitTime());
        source.put("user", tx.user());
        source.put("seq", (long) seq);
        source.put("txn_rows", (long) tx.changes().size());

        Map<String, Object> v = new LinkedHashMap<>();
        v.put("op", switch (c.kind()) {
            case INSERT -> "c";
            case UPDATE -> "u";
            case DELETE -> "d";
            default -> throw new IllegalArgumentException("not a row change: " + c.kind());
        });
        v.put("before", c.before());
        v.put("after", c.after());
        v.put("source", source);
        v.put("ts_ms", System.currentTimeMillis());
        return v;
    }
}
