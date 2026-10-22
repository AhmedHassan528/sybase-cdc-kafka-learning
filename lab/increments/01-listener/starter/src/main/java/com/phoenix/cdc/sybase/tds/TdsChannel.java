package com.phoenix.cdc.sybase.tds;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

/**
 * TDS 5.0 packet framing over one socket.
 *
 * Every TDS packet starts with an 8-byte header:
 *   [0] type   [1] status (bit 0x01 = last packet of message)
 *   [2..3] total packet length incl. header, always big-endian
 *   [4..5] channel  [6] packet number  [7] window
 * A logical message may span several packets; {@link #read()} reassembles it.
 */
public final class TdsChannel implements AutoCloseable {

    public static final int PKT_LANGUAGE = 0x01;  // old-style language: payload is raw SQL text
    public static final int PKT_LOGIN    = 0x02;
    public static final int PKT_RPC      = 0x03;
    public static final int PKT_RESPONSE = 0x04;
    public static final int PKT_ATTN     = 0x06;
    public static final int PKT_NORMAL   = 0x0F;  // TDS 5.0 token stream (LANGUAGE, DBRPC, DYNAMIC...)

    private static final int HEADER = 8;

    private final Socket socket;
    private final InputStream in;
    private final OutputStream out;
    private int packetSize = 512;
    private java.util.function.Consumer<String> packetTrace;

    /** Optional per-packet header trace (debugging the wire protocol). */
    public void setPacketTrace(java.util.function.Consumer<String> packetTrace) {
        this.packetTrace = packetTrace;
    }

    public TdsChannel(Socket socket) throws IOException {
        this.socket = socket;
        this.in = socket.getInputStream();
        this.out = socket.getOutputStream();
    }

    public record Message(int type, byte[] payload) {}

    /** Reads one complete message, or returns null on a clean end of stream. */
    public Message read() throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        while (true) {
            byte[] hdr = in.readNBytes(HEADER);
            if (hdr.length == 0 && buf.size() == 0) return null;
            if (hdr.length < HEADER) throw new EOFException("truncated TDS header");
            int type = hdr[0] & 0xff;
            int status = hdr[1] & 0xff;
            int len = ((hdr[2] & 0xff) << 8) | (hdr[3] & 0xff);
            byte[] body = in.readNBytes(len - HEADER);
            if (body.length < len - HEADER) throw new EOFException("truncated TDS packet");
            if (packetTrace != null) packetTrace.accept(String.format("packet type=0x%02x status=0x%02x len=%d seq=%d", type, status, len, hdr[6] & 0xff));
            buf.write(body);
            if ((status & 0x01) != 0) return new Message(type, buf.toByteArray());
        }
    }

    /** Sends a response message (packet type 0x04), split into packets of the negotiated size. */
    public synchronized void sendResponse(byte[] tokens) throws IOException {
        int chunk = packetSize - HEADER;
        int off = 0;
        int seq = 1;
        do {
            int n = Math.min(chunk, tokens.length - off);
            boolean last = off + n >= tokens.length;
            int len = n + HEADER;
            out.write(new byte[] {
                (byte) PKT_RESPONSE, (byte) (last ? 0x01 : 0x00),
                (byte) (len >> 8), (byte) len, 0, 0, (byte) seq++, 0 });
            out.write(tokens, off, n);
            off += n;
        } while (off < tokens.length);
        out.flush();
    }

    public void setPacketSize(int packetSize) {
        if (packetSize >= 512 && packetSize <= 65535) this.packetSize = packetSize;
    }

    public String remote() {
        return String.valueOf(socket.getRemoteSocketAddress());
    }

    @Override
    public void close() throws IOException {
        socket.close();
    }
}
