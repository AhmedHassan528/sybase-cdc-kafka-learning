package com.phoenix.cdc.sybase.tds;

import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Parsed TDS 5.0 login record (packet type 0x02).
 *
 * The record is a fixed layout of 30-byte name fields, each followed by a
 * one-byte length. Offsets below follow the Sybase TDS 5.0 spec / FreeTDS.
 * After the record the client appends a CAPABILITY token (0xE2), which we
 * echo back so the client sees the same capability set it asked for.
 */
public final class TdsLogin {

    public final String host;
    public final String user;
    public final String password;
    public final String appName;
    public final String serverName;
    public final String progName;
    public final String charset;
    public final int packetSize;
    /** Byte order the client wants integers in (lint2 field: 3 = little-endian, 2 = big-endian). */
    public final ByteOrder order;
    /** Raw CAPABILITY token from the login packet (including the 0xE2 byte), or null. */
    public final byte[] capabilityToken;

    private TdsLogin(byte[] p) {
        host = field(p, 0, 30);
        user = field(p, 31, 30);
        password = field(p, 62, 30);
        order = (p.length > 124 && p[124] == 2) ? ByteOrder.BIG_ENDIAN : ByteOrder.LITTLE_ENDIAN;
        appName = field(p, 140, 30);
        serverName = field(p, 171, 30);
        progName = field(p, 462, 10);
        charset = field(p, 525, 30);
        String bs = field(p, 557, 6);
        int ps;
        try { ps = Integer.parseInt(bs.trim()); } catch (NumberFormatException e) { ps = 512; }
        packetSize = ps;
        capabilityToken = findCapability(p);
    }

    public static TdsLogin parse(byte[] payload) {
        return new TdsLogin(payload);
    }

    private static String field(byte[] p, int off, int max) {
        if (p.length <= off + max) return "";
        int len = Math.min(p[off + max] & 0xff, max);
        return new String(p, off, len, StandardCharsets.ISO_8859_1);
    }

    /** The capability token is the tail of the packet: 0xE2, u16 length, body. Accept either byte order. */
    private static byte[] findCapability(byte[] p) {
        for (int i = 400; i < p.length - 3; i++) {
            if ((p[i] & 0xff) != 0xE2) continue;
            int be = ((p[i + 1] & 0xff) << 8) | (p[i + 2] & 0xff);
            int le = ((p[i + 2] & 0xff) << 8) | (p[i + 1] & 0xff);
            if (i + 3 + be == p.length || i + 3 + le == p.length) return Arrays.copyOfRange(p, i, p.length);
        }
        return null;
    }

    @Override
    public String toString() {
        return "TdsLogin{host=" + host + ", user=" + user + ", app=" + appName + ", server=" + serverName
            + ", prog=" + progName + ", charset=" + charset + ", packetSize=" + packetSize
            + ", order=" + order + ", capability=" + (capabilityToken != null ? capabilityToken.length + "B" : "none") + "}";
    }
}
