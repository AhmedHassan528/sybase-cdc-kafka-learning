package com.phoenix.cdc.sybase.connect;

import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlCommand.Kind;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Increment 4: the shape of the event (class ChangeEventMapper). The expected shape is the one the lab produced for
 * real changes (evidence 14, and contracts/change-event.md): topic per table, key from the primary key, and a value
 * with op, before, after, source and ts_ms.
 */
class ChangeEventMapperTest {

    private static final byte[] OQID = {0x00, 0x01, (byte) 0xab};
    private static final byte[] COMMIT_OQID = {0x00, 0x02, (byte) 0xcd};

    private final ChangeEventMapper mapper = new ChangeEventMapper("MYSYBASE", "phoenix_test", "sybase");

    private static Map<String, Object> row(Object id, String account) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("payment_id", id);
        m.put("account_no", account);
        return m;
    }

    private static LtlCommand change(Kind kind, Map<String, Object> before, Map<String, Object> after, List<String> keys) {
        return new LtlCommand(kind, null, OQID, new byte[] {1}, "dbo", "payment", before, after, keys, null, null, "");
    }

    private static CommittedTransaction tx(LtlCommand... rows) {
        return new CommittedTransaction("00ff", COMMIT_OQID, "2026-10-22T20:12:45.493", "sa", List.of(rows));
    }

    @Test
    void checkpoint1_theTopicIsPrefixDatabaseTable() {
        LtlCommand c = change(Kind.INSERT, null, row("1", "ACC-1"), List.of("payment_id"));
        assertEquals("sybase.phoenix_test.payment", mapper.topic(c));
    }

    @Test
    void checkpoint2_theKeyHoldsThePrimaryKeyColumns() {
        LtlCommand ins = change(Kind.INSERT, null, row("1", "ACC-1"), List.of("payment_id"));
        assertEquals(Map.of("payment_id", "1"), mapper.key(ins));

        LtlCommand del = change(Kind.DELETE, row("2", "ACC-2"), null, List.of("payment_id"));
        assertEquals(Map.of("payment_id", "2"), mapper.key(del), "a delete has no after image: take the key from the before image");
    }

    @Test
    void checkpoint3_aTableWithoutAKeyGetsNoKey() {
        LtlCommand c = change(Kind.INSERT, null, row("1", "ACC-1"), List.of());
        assertNull(mapper.key(c));
    }

    @Test
    void checkpoint4_anInsertIsOpCWithNoBefore() {
        Map<String, Object> v = mapper.value(change(Kind.INSERT, null, row("1", "ACC-1"), List.of("payment_id")), tx(), 0);
        assertEquals("c", v.get("op"));
        assertNull(v.get("before"));
        assertEquals(row("1", "ACC-1"), v.get("after"));
    }

    @Test
    void checkpoint5_anUpdateIsOpUWithBothImagesAndADeleteIsOpDWithNoAfter() {
        Map<String, Object> u = mapper.value(change(Kind.UPDATE, row("1", "OLD"), row("1", "NEW"), List.of("payment_id")), tx(), 0);
        assertEquals("u", u.get("op"));
        assertEquals(row("1", "OLD"), u.get("before"));
        assertEquals(row("1", "NEW"), u.get("after"));

        Map<String, Object> d = mapper.value(change(Kind.DELETE, row("2", "ACC-2"), null, List.of("payment_id")), tx(), 0);
        assertEquals("d", d.get("op"));
        assertEquals(row("2", "ACC-2"), d.get("before"));
        assertNull(d.get("after"));
    }

    @Test
    void checkpoint6_aCommandThatIsNotARowChangeIsRefused() {
        assertThrows(IllegalArgumentException.class,
            () -> mapper.value(change(Kind.COMMIT, null, null, List.of()), tx(), 0));
    }

    @Test
    @SuppressWarnings("unchecked")
    void checkpoint7_theSourceBlockSaysWhereTheChangeCameFrom() {
        LtlCommand a = change(Kind.INSERT, null, row("1", "ACC-1"), List.of("payment_id"));
        LtlCommand b = change(Kind.INSERT, null, row("2", "ACC-2"), List.of("payment_id"));
        Map<String, Object> v = mapper.value(b, tx(a, b), 1);
        Map<String, Object> s = (Map<String, Object>) v.get("source");

        assertEquals("MYSYBASE", s.get("server"));
        assertEquals("phoenix_test", s.get("db"));
        assertEquals("dbo", s.get("owner"));
        assertEquals("payment", s.get("table"));
        assertEquals("00ff", s.get("xid"), "the transaction id");
        assertEquals("0001ab", s.get("oqid"), "the log position of THIS row change, as lower-case hex");
        assertEquals("0002cd", s.get("commit_oqid"), "the log position of the commit, as lower-case hex");
        assertEquals("2026-10-22T20:12:45.493", s.get("commit_time"));
        assertEquals("sa", s.get("user"));
        assertEquals(1L, s.get("seq"), "the position of this row among the rows of the transaction (a Long)");
        assertEquals(2L, s.get("txn_rows"), "how many rows the transaction has (a Long)");
    }

    @Test
    void checkpoint8_theFieldsComeOutInTheDocumentedOrder() {
        // The JSON a consumer reads is written in map order; the lab's events (evidence 14) have exactly this order.
        LtlCommand c = change(Kind.INSERT, null, row("1", "ACC-1"), List.of("payment_id"));
        long before = System.currentTimeMillis();
        Map<String, Object> v = mapper.value(c, tx(c), 0);
        long after = System.currentTimeMillis();

        assertEquals(List.of("op", "before", "after", "source", "ts_ms"), List.copyOf(v.keySet()));
        @SuppressWarnings("unchecked")
        Map<String, Object> s = (Map<String, Object>) v.get("source");
        assertEquals(List.of("server", "db", "owner", "table", "xid", "oqid", "commit_oqid", "commit_time", "user", "seq", "txn_rows"),
            List.copyOf(s.keySet()));
        long ts = (Long) v.get("ts_ms");
        assertTrue(ts >= before && ts <= after, "ts_ms is the time the event was built, in milliseconds");
    }
}
