package com.phoenix.cdc.sybase.ltl;

import com.phoenix.cdc.sybase.ltl.LtlLexer.Token;
import com.phoenix.cdc.sybase.ltl.LtlLexer.Type;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Increment 2, part A: turning one value token from the LTL text into a Java value (class LtlValues).
 * The expectations match what the real events carried in the lab (evidence 15): integers and floats are numbers,
 * exact decimals stay strings, dates are ISO text, binary stays bytes.
 */
class LtlValuesTest {

    private static Token bare(String s) {
        return new Token(Type.BARE, (char) 0, s.getBytes(StandardCharsets.ISO_8859_1), 0);
    }

    private static Token value(char marker, String s) {
        return new Token(Type.VALUE, marker, s.getBytes(StandardCharsets.ISO_8859_1), 0);
    }

    private static Object convert(Token t) {
        return LtlValues.convert(t, StandardCharsets.ISO_8859_1);
    }

    @Test
    void valuesCheckpoint1_bareTokensAreNumbersOrNull() {
        assertEquals(255L, convert(bare("255")));
        assertEquals(-32768L, convert(bare("-32768")));
        assertEquals(Long.MAX_VALUE, convert(bare("9223372036854775807")));
        assertNull(convert(bare("NULL")));
        assertNull(convert(bare("null")), "NULL is not case sensitive");
    }

    @Test
    void valuesCheckpoint2_textAndBinary() {
        assertEquals("abc", convert(value('"', "abc")));
        assertEquals("it's", convert(value('#', "it's")));
        assertEquals("uni", LtlValues.convert(new Token(Type.VALUE, '6', "uni".getBytes(StandardCharsets.UTF_16BE), 0), StandardCharsets.ISO_8859_1),
            "unichar and univarchar (markers 6, 7, <) are UTF-16 big-endian");
        assertArrayEquals(new byte[] {1, 2, 3, 4}, (byte[]) LtlValues.convert(new Token(Type.VALUE, ',', new byte[] {1, 2, 3, 4}, 0), StandardCharsets.ISO_8859_1));
    }

    @Test
    void valuesCheckpoint3_decimalsStayStringsAndMoneyLosesItsDollarSign() {
        assertEquals("12345.6789", convert(value('%', "12345.6789")));
        assertEquals("100", convert(value('%', "100.")), "ASE sends numeric 100.00 as \"100.\"; the dangling point goes");
        assertEquals("1234.5678", convert(value('(', "$1234.5678")), "money: the $ is removed, the digits are kept exactly");
        assertEquals("-12.3400", convert(value(')', "-12.3400")));
    }

    @Test
    void valuesCheckpoint4_floatsAreDoubles() {
        assertEquals(3.14159265358979, convert(value('&', "3.14159265358979")));
        assertEquals(2.5, convert(value('\'', "2.5")));
    }

    @Test
    void valuesCheckpoint5_datesAndTimesBecomeIsoText() {
        assertEquals("2026-10-20T13:45:56.123", convert(value('*', "20261020 13:45:56:123")));
        assertEquals("2026-10-20T13:45:00.000", convert(value('+', "20261020 13:45:00:000")));
        assertEquals("2026-10-20", convert(value('=', "20261020")));
        assertEquals("13:45:56.000", convert(value('>', "13:45:56:000")));
        assertEquals("2026-10-20T13:45:56.123456", convert(value('E', "20261020 13:45:56.123456")));
    }

    @Test
    void valuesCheckpoint6_helperFunctions() {
        assertEquals("100", LtlValues.decimal("100."));
        assertEquals("100.5", LtlValues.decimal("100.5"));
        assertEquals("-12.3400", LtlValues.decimal("-12.3400"));
        assertEquals("2026-10-20T13:45:56.123", LtlValues.dateTime("20261020 13:45:56:123"));
        assertEquals("2026-10-20T13:45:56.123456", LtlValues.dateTime("20261020 13:45:56.123456"));
        assertEquals("2026-10-20", LtlValues.date("20261020"));
        assertEquals("13:45:56.000", LtlValues.time("13:45:56:000"));
    }
}
