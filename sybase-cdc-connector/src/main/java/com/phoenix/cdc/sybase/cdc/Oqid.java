package com.phoenix.cdc.sybase.cdc;

import java.util.Arrays;
import java.util.HexFormat;

/**
 * Origin queue ID helpers. RepAgent generates a 32-byte, strictly increasing ID
 * per log record; "get truncation" expects 36 bytes back (the last 4 are
 * Replication Server's own and are ignored by RepAgent).
 */
public final class Oqid {

    public static final int LOCATOR_LEN = 36;

    private Oqid() {}

    /** Unsigned byte-wise comparison: OQIDs increase in log order. */
    public static int compare(byte[] a, byte[] b) {
        return Arrays.compareUnsigned(a, b);
    }

    /** The value returned to "get truncation": the OQID padded to 36 bytes, or zeros if none. */
    public static byte[] locator(byte[] oqid) {
        return oqid == null ? new byte[LOCATOR_LEN] : Arrays.copyOf(oqid, LOCATOR_LEN);
    }

    public static String hex(byte[] b) {
        return b == null ? null : HexFormat.of().formatHex(b);
    }

    public static byte[] fromHex(String h) {
        return h == null || h.isEmpty() ? null : HexFormat.of().parseHex(h);
    }
}
