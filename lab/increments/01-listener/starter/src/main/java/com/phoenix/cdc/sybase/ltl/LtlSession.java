package com.phoenix.cdc.sybase.ltl;

import com.phoenix.cdc.sybase.tds.TdsChannel;
import com.phoenix.cdc.sybase.tds.TdsLogin;
import com.phoenix.cdc.sybase.tds.TdsTokens;
import com.phoenix.cdc.sybase.tds.TdsTokens.Column;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.Socket;
import java.nio.ByteOrder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * One RepAgent connection. Plays the part of a Replication Server:
 *
 * <ol>
 *   <li>TDS login → LOGINACK</li>
 *   <li>"connect source lti 'srv'.'db' 760" → two result sets: negotiated LTL version; Sysversion + UpgradeLocater</li>
 *   <li>"get maintenance user for 'srv'.'db'" → one row: user name</li>
 *   <li>"get truncation 'srv'.'db'" → one row: 36-byte origin queue ID</li>
 *   <li>"distribute ..." batches → handed to the listener, answered with DONE</li>
 * </ol>
 */
final class LtlSession implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(LtlSession.class);
    private static final String SERVER_NAME = "CDC_RS";

    /** Replication Server version we claim to be (16.0); RepAgent only uses it for compatibility checks. */
    private static final int RS_SYSVERSION = 1600;
    private static final int UPGRADE_LOCATOR_LEN = 36;
    private static final int ENV_PACKETSIZE = 4;
    private static final Pattern CONNECT_SOURCE =
        Pattern.compile("connect source lti\\s+\"?([^\".\\s]+)\"?\\s*\\.\\s*\"?([^\".\\s]+)\"?\\s+(\\d+)", Pattern.CASE_INSENSITIVE);

    private static final List<Column> VERSION_COLS = List.of(new Column("VERSION", TdsTokens.TYPE_INT4, 4));
    private static final List<Column> SYSVERSION_COLS = List.of(
        new Column("Sysversion", TdsTokens.TYPE_INT4, 4),
        new Column("UpgradeLocater", TdsTokens.TYPE_VARBINARY, UPGRADE_LOCATOR_LEN));
    private static final List<Column> MAINT_COLS = List.of(new Column("maint_user", TdsTokens.TYPE_VARCHAR, 30));
    private static final List<Column> TRUNC_COLS = List.of(new Column("truncation", TdsTokens.TYPE_VARBINARY, 36));

    private final Socket socket;
    private final LtlListener listener;
    private final boolean trace;
    private final Charset charsetOverride;

    private TdsChannel ch;
    private ByteOrder order = ByteOrder.LITTLE_ENDIAN;
    private Charset charset = StandardCharsets.ISO_8859_1;
    private String server = "?";
    private String database = "?";

    LtlSession(Socket socket, LtlListener listener, boolean trace, Charset charsetOverride) {
        this.socket = socket;
        this.listener = listener;
        this.trace = trace;
        this.charsetOverride = charsetOverride;
    }

    @Override
    public void run() {
        Exception cause = null;
        try (TdsChannel c = new TdsChannel(socket)) {
            ch = c;
            if (trace) ch.setPacketTrace(s -> log.info("TDS {}", s));
            log.info("RepAgent connected from {}", ch.remote());
            TdsChannel.Message m;
            while ((m = ch.read()) != null) {
                switch (m.type()) {
                    case TdsChannel.PKT_LOGIN -> login(m.payload());
                    case TdsChannel.PKT_LANGUAGE -> language(m.payload());
                    case TdsChannel.PKT_NORMAL -> tokenStream(m.payload());
                    case TdsChannel.PKT_ATTN -> ch.sendResponse(tokens().done(TdsTokens.DONE_ATTN, 0).bytes());
                    default -> {
                        log.warn("Unhandled TDS packet type 0x{} ({} bytes)", Integer.toHexString(m.type()), m.payload().length);
                        ch.sendResponse(tokens().done(TdsTokens.DONE_FINAL, 0).bytes());
                    }
                }
            }
            log.info("RepAgent for {}.{} disconnected", server, database);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            cause = e;
        } catch (Exception e) {
            cause = e;
            log.warn("RepAgent session {}.{} ended with error: {}", server, database, e.toString());
        } finally {
            listener.onDisconnect(server, database, cause);
        }
    }

    private void login(byte[] payload) throws IOException {
        // TODO 4 (checkpoints 1 and 2): answer the TDS login.
        //   - TdsLogin.parse(payload) gives user, password, byte order, character set, packet size, capability token.
        //   - remember the byte order (`order`) and character set (`charset`; `charsetOverride` wins if set).
        //   - ask listener.authenticate(user, password).
        //   - refused: send message(4002, 14, "Login failed for user ...", SERVER_NAME), loginAck(false, ...) and
        //     done(DONE_ERROR, 0) in one response and return.
        //   - accepted: send loginAck(true, "Replication Server", {16,0,0,0}), the capability token echoed back with
        //     raw(...) when the client sent one, envChange(ENV_PACKETSIZE, <packet size>, "512") and done(DONE_FINAL, 0),
        //     then switch the channel to that packet size with ch.setPacketSize(...).
        //   Build responses with tokens() and send them with ch.sendResponse(tokens.bytes()).
        throw new UnsupportedOperationException("increment 1: LtlSession.login()");
    }

    /** TDS 5.0 token stream: we expect a LANGUAGE token (0x21): u32 length, u8 status, text. */
    private void tokenStream(byte[] p) throws IOException, InterruptedException {
        // TODO 5 (checkpoint 3): RepAgent sends "connect source" as a TDS 5.0 token stream, not as plain language text.
        //   A LANGUAGE token is: byte 0x21, u32 length (in the client's byte order, `order`), u8 status, then the text.
        //   Extract the text (length - 1 bytes after the 6 header bytes) and pass it to language(...).
        //   Anything else: log a warning and answer with done(DONE_FINAL, 0).
        throw new UnsupportedOperationException("increment 1: LtlSession.tokenStream()");
    }

    private void language(byte[] raw) throws IOException, InterruptedException {
        // TODO 6 (checkpoints 3, 4 and 5): decide what the text is and answer it.
        //   Read it as ISO-8859-1 so offsets match the bytes. Then:
        //   - starts with "connect source": match CONNECT_SOURCE to get server, database and the proposed LTL version;
        //     ask listener.onConnectSource(...) (a RuntimeException means refuse: message(32001, 16, ...) + done(DONE_ERROR));
        //     answer with two result sets: rowFormat(VERSION_COLS) + row(version) + done(DONE_MORE | DONE_COUNT, 1), then
        //     rowFormat(SYSVERSION_COLS) + row(RS_SYSVERSION, new byte[UPGRADE_LOCATOR_LEN]) + done(DONE_COUNT, 1).
        //   - starts with "get maintenance user": one row (MAINT_COLS) with listener.maintenanceUser(server, database).
        //   - starts with "get truncation": one row (TRUNC_COLS) with listener.truncationPoint(server, database).
        //   - anything else that does not start with "get ": it is LTL data. Hand the raw bytes to listener.onLtl(raw) and
        //     answer with exactly one done(DONE_FINAL, 0).
        //   - other "get ..." commands: log a warning and answer done(DONE_FINAL, 0).
        throw new UnsupportedOperationException("increment 1: LtlSession.language()");
    }

    private TdsTokens tokens() {
        return new TdsTokens(order, charset);
    }

    static Charset javaCharset(String sybase) {
        String s = sybase == null ? "" : sybase.trim().toLowerCase(Locale.ROOT);
        return switch (s) {
            case "utf8", "utf-8" -> StandardCharsets.UTF_8;
            case "cp1256" -> Charset.forName("windows-1256");
            case "cp1252" -> Charset.forName("windows-1252");
            case "cp850" -> Charset.forName("IBM850");
            case "iso_1", "" -> StandardCharsets.ISO_8859_1;
            default -> {
                try { yield Charset.forName(s); } catch (Exception e) { yield StandardCharsets.ISO_8859_1; }
            }
        };
    }
}
