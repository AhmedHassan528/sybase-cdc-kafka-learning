package com.phoenix.cdc.sybase.ltl;

import com.phoenix.cdc.sybase.ltl.LtlCommand.Kind;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Parses real LTL 760 messages captured from ASE 16.0 SP02 RepAgent (src/test/resources/ltl760). */
class LtlParserTest {

    private static List<LtlCommand> parse(String fixture) throws IOException {
        try (InputStream in = LtlParserTest.class.getResourceAsStream("/ltl760/" + fixture)) {
            assertNotNull(in, fixture);
            return LtlParser.parse(in.readAllBytes(), StandardCharsets.ISO_8859_1);
        }
    }

    private static LtlCommand first(List<LtlCommand> cmds, Kind kind, String table) {
        return cmds.stream().filter(c -> c.kind() == kind && (table == null || table.equals(c.table())))
            .findFirst().orElseThrow(() -> new AssertionError("no " + kind + " " + table + " in " + cmds));
    }

    @Test
    void insertDecodesEveryDatatype() throws IOException {
        LtlCommand c = first(parse("types-insert.bin"), Kind.INSERT, "ltl_types");
        Map<String, Object> a = c.after();
        assertEquals("dbo", c.owner());
        assertEquals(List.of("id"), c.keyColumns());
        assertEquals(1L, a.get("id"));
        assertEquals(255L, a.get("c_tiny"));
        assertEquals(-32768L, a.get("c_small"));
        assertEquals(Long.MAX_VALUE, a.get("c_big"));
        assertEquals(1L, a.get("c_bit"));
        assertEquals("12345.6789", a.get("c_num"));
        assertEquals("42", a.get("c_dec"));
        assertEquals("1234.5678", a.get("c_money"));
        assertEquals("-12.3400", a.get("c_smoney"));
        assertEquals(3.14159265358979, a.get("c_float"));
        assertEquals(2.5, a.get("c_real"));
        assertEquals("abc", a.get("c_char"));
        assertEquals("it's ~ \"quoted\" ~\"x", a.get("c_vchar"));
        assertEquals("uni", a.get("c_uvchar"));
        assertEquals("2026-10-20T13:45:56.123", a.get("c_dt"));
        assertEquals("2026-10-20T13:45:00.000", a.get("c_sdt"));
        assertEquals("2026-10-20", a.get("c_date"));
        assertEquals("13:45:56.000", a.get("c_time"));
        assertEquals("2026-10-20T13:45:56.123456", a.get("c_bdt"));
        assertArrayEquals(new byte[] {1, 2, 3, 4}, (byte[]) a.get("c_bin"));
        assertArrayEquals(new byte[] {(byte) 0xde, (byte) 0xad, (byte) 0xbe, (byte) 0xef}, (byte[]) a.get("c_vbin"));
        assertEquals(32, c.oqid().length);
        assertNotNull(c.tranId());
        assertNull(c.originTime());   // only begin/commit carry tag 1 (origin_time)
    }

    @Test
    void updateAfterImageIsMergedWithBeforeImage() throws IOException {
        LtlCommand c = first(parse("types-update.bin"), Kind.UPDATE, "ltl_types");
        assertEquals("1234.5678", c.before().get("c_money"));
        assertEquals("99.9900", c.after().get("c_money"));
        assertEquals("updated", c.after().get("c_vchar"));
        // unchanged columns come from the before image
        assertEquals("abc", c.after().get("c_char"));
        assertEquals(c.before().size(), c.after().size());
    }

    @Test
    void deleteHasOnlyBeforeImage() throws IOException {
        LtlCommand c = first(parse("types-delete.bin"), Kind.DELETE, "ltl_types");
        assertEquals(2L, c.before().get("id"));
        assertNull(c.after());
        assertNull(c.before().get("c_money"));
    }

    @Test
    void rolledBackTransaction() throws IOException {
        List<LtlCommand> cmds = parse("types-rollback.bin");
        LtlCommand ins = first(cmds, Kind.INSERT, "ltl_types");
        LtlCommand rb = first(cmds, Kind.ROLLBACK, null);
        assertEquals("rolled back", ins.after().get("c_vchar"));
        assertArrayEquals(ins.tranId(), rb.tranId());
    }

    @Test
    void multiRowTransactionKeepsLogOrder() throws IOException {
        List<LtlCommand> cmds = parse("types-multirow.bin").stream()
            .filter(c -> c.isRowChange() || c.kind() == Kind.COMMIT).toList();
        assertEquals(List.of(Kind.INSERT, Kind.INSERT, Kind.UPDATE, Kind.COMMIT),
            cmds.subList(cmds.size() - 4, cmds.size()).stream().map(LtlCommand::kind).toList());
    }

    @Test
    void longValuesUseTwoAndThreeLengthDigits() throws IOException {
        LtlCommand c = first(parse("long-values.bin"), Kind.INSERT, "ltl_long");
        assertEquals(List.of("k1", "k2"), c.keyColumns());
        assertEquals("E".repeat(5000), c.after().get("big"));
        assertEquals(66, ((byte[]) c.after().get("vb")).length);
        assertEquals("W".repeat(40), c.after().get("uv"));

        LtlCommand c3 = first(parse("long3-values.bin"), Kind.INSERT, "ltl_long3");
        assertEquals(5000, ((byte[]) c3.after().get("vb")).length);
        assertEquals("U".repeat(2100), c3.after().get("uv"));
    }

    @Test
    void paymentInsert() throws IOException {
        List<LtlCommand> cmds = parse("payment-insert.bin");
        LtlCommand c = first(cmds, Kind.INSERT, "payment");
        assertEquals(List.of("payment_id"), c.keyColumns());
        assertEquals("ACC-0002", c.after().get("account_no"));
        assertEquals("250.75", c.after().get("amount"));
        assertEquals("USD", c.after().get("currency"));
        assertTrue(cmds.stream().anyMatch(x -> x.kind() == Kind.COMMIT));
    }
}
