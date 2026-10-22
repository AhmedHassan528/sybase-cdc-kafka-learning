package com.phoenix.cdc.sybase.tds;

import java.io.ByteArrayOutputStream;
import java.nio.ByteOrder;
import java.nio.charset.Charset;
import java.util.List;

/**
 * Builds a TDS 5.0 response token stream. Integers are written in the byte
 * order the client asked for at login.
 *
 * Tokens used by a minimal "Replication Server":
 *   0xAD LOGINACK   0xE2 CAPABILITY   0xE3 ENVCHANGE   0xE5 EED (message)
 *   0xEE ROWFMT     0xD1 ROW          0xFD DONE
 */
public final class TdsTokens {

    public static final int DONE_FINAL = 0x0000;
    public static final int DONE_MORE  = 0x0001;
    public static final int DONE_ERROR = 0x0002;
    public static final int DONE_COUNT = 0x0010;
    public static final int DONE_ATTN  = 0x0020;

    /** Wire datatypes we need for result sets. */
    public static final int TYPE_INT4 = 0x38;
    public static final int TYPE_VARCHAR = 0x27;
    public static final int TYPE_VARBINARY = 0x25;

    public record Column(String name, int type, int maxLen) {}

    private final ByteArrayOutputStream out = new ByteArrayOutputStream();
    private final ByteOrder order;
    private final Charset charset;

    public TdsTokens(ByteOrder order, Charset charset) {
        this.order = order;
        this.charset = charset;
    }

    public TdsTokens loginAck(boolean ok, String progName, byte[] progVersion) {
        byte[] name = progName.getBytes(charset);
        Buf b = new Buf();
        b.u8(ok ? 5 : 6);                 // 5 = TDS_LOG_SUCCEED, 6 = TDS_LOG_FAIL
        b.raw(new byte[] {5, 0, 0, 0});   // TDS version 5.0
        b.u8(name.length).raw(name);
        b.raw(progVersion);
        return token(0xAD, b, false);
    }

    /** Echo the client's capability token unchanged (it carries its own length). */
    public TdsTokens raw(byte[] token) {
        out.writeBytes(token);
        return this;
    }

    public TdsTokens envChange(int type, String newValue, String oldValue) {
        byte[] nv = newValue.getBytes(charset);
        byte[] ov = oldValue.getBytes(charset);
        Buf b = new Buf();
        b.u8(type).u8(nv.length).raw(nv).u8(ov.length).raw(ov);
        return token(0xE3, b, false);
    }

    /** Extended error/info message (EED). severity >= 11 is an error to the client. */
    public TdsTokens message(int number, int severity, String text, String serverName) {
        byte[] msg = text.getBytes(charset);
        byte[] srv = serverName.getBytes(charset);
        Buf b = new Buf();
        b.u32(number).u8(1).u8(severity);
        b.u8(5).raw("ZZZZZ".getBytes(charset));   // SQLSTATE
        b.u8(0);                                   // status: no params follow
        b.u16(0);                                  // transaction state
        b.u16(msg.length).raw(msg);
        b.u8(srv.length).raw(srv);
        b.u8(0);                                   // procedure name length
        b.u16(0);                                  // line number
        return token(0xE5, b, false);
    }

    public TdsTokens rowFormat(List<Column> cols) {
        Buf b = new Buf();
        b.u16(cols.size());
        for (Column c : cols) {
            byte[] n = c.name().getBytes(charset);
            b.u8(n.length).raw(n);
            b.u8(0x10);        // status: nullable
            b.u32(0);          // usertype
            b.u8(c.type());
            if (c.type() != TYPE_INT4) b.u8(c.maxLen());
            b.u8(0);           // locale length
        }
        return token(0xEE, b, false);
    }

    /** One row; values must match the row format: Integer for INT4, String for VARCHAR, byte[] for VARBINARY. */
    public TdsTokens row(List<Column> cols, Object... values) {
        out.write(0xD1);
        Buf b = new Buf();
        for (int i = 0; i < cols.size(); i++) {
            Object v = values[i];
            switch (cols.get(i).type()) {
                case TYPE_INT4 -> b.u32((Integer) v);
                case TYPE_VARCHAR -> { byte[] s = ((String) v).getBytes(charset); b.u8(s.length).raw(s); }
                case TYPE_VARBINARY -> { byte[] s = (byte[]) v; b.u8(s.length).raw(s); }
                default -> throw new IllegalArgumentException("type " + cols.get(i).type());
            }
        }
        out.writeBytes(b.bytes());
        return this;
    }

    public TdsTokens done(int status, int count) {
        out.write(0xFD);
        Buf b = new Buf();
        b.u16(status).u16(0).u32(count);
        out.writeBytes(b.bytes());
        return this;
    }

    public byte[] bytes() {
        return out.toByteArray();
    }

    private TdsTokens token(int id, Buf body, boolean len32) {
        byte[] data = body.bytes();
        out.write(id);
        Buf len = new Buf();
        if (len32) len.u32(data.length); else len.u16(data.length);
        out.writeBytes(len.bytes());
        out.writeBytes(data);
        return this;
    }

    /** Little helper that writes integers in the negotiated byte order. */
    private final class Buf {
        private final ByteArrayOutputStream b = new ByteArrayOutputStream();

        Buf u8(int v) { b.write(v); return this; }

        Buf u16(int v) {
            if (order == ByteOrder.LITTLE_ENDIAN) { b.write(v); b.write(v >> 8); }
            else { b.write(v >> 8); b.write(v); }
            return this;
        }

        Buf u32(int v) {
            if (order == ByteOrder.LITTLE_ENDIAN) { b.write(v); b.write(v >> 8); b.write(v >> 16); b.write(v >> 24); }
            else { b.write(v >> 24); b.write(v >> 16); b.write(v >> 8); b.write(v); }
            return this;
        }

        Buf raw(byte[] bytes) { b.writeBytes(bytes); return this; }

        byte[] bytes() { return b.toByteArray(); }
    }
}
