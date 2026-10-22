package com.phoenix.cdc.sybase.ltl;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LtlValuesTest {

    @Test
    void decimalsDropDanglingPoint() {
        assertEquals("100", LtlValues.decimal("100."));
        assertEquals("100.5", LtlValues.decimal("100.5"));
        assertEquals("-12.3400", LtlValues.decimal("-12.3400"));
    }

    @Test
    void dateTimes() {
        assertEquals("2026-10-20T13:45:56.123", LtlValues.dateTime("20261020 13:45:56:123"));
        assertEquals("2026-10-20T13:45:56.123456", LtlValues.dateTime("20261020 13:45:56.123456"));
        assertEquals("2026-10-20", LtlValues.date("20261020"));
        assertEquals("13:45:56.000", LtlValues.time("13:45:56:000"));
    }
}
