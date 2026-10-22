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
        TdsLogin login = TdsLogin.parse(payload);
        order = login.order;
        charset = charsetOverride != null ? charsetOverride : javaCharset(login.charset);
        log.info("TDS login: {} -> using charset {}", login, charset);

        boolean ok = listener.authenticate(login.user, login.password);
        TdsTokens r = tokens();
        if (!ok) {
            r.message(4002, 14, "Login failed for user '" + login.user + "'", SERVER_NAME);
            r.loginAck(false, "Replication Server", new byte[] {16, 0, 0, 0});
            r.done(TdsTokens.DONE_ERROR, 0);
            ch.sendResponse(r.bytes());
            log.warn("Rejected RepAgent login for user '{}'", login.user);
            return;
        }
        r.loginAck(true, "Replication Server", new byte[] {16, 0, 0, 0});
        if (login.capabilityToken != null) r.raw(login.capabilityToken);
        // Confirm the packet size RepAgent asked for ("send buffer size", 2k by default). Without this
        // CT-Lib falls back to 512-byte packets and splits RepAgent's buffers with misplaced EOM flags.
        r.envChange(ENV_PACKETSIZE, String.valueOf(login.packetSize), "512");
        r.done(TdsTokens.DONE_FINAL, 0);
        ch.sendResponse(r.bytes());
        ch.setPacketSize(login.packetSize);
    }

    /** TDS 5.0 token stream: we expect a LANGUAGE token (0x21): u32 length, u8 status, text. */
    private void tokenStream(byte[] p) throws IOException, InterruptedException {
        if (p.length >= 6 && (p[0] & 0xff) == 0x21) {
            int len = order == ByteOrder.LITTLE_ENDIAN
                ? (p[1] & 0xff) | (p[2] & 0xff) << 8 | (p[3] & 0xff) << 16 | (p[4] & 0xff) << 24
                : (p[1] & 0xff) << 24 | (p[2] & 0xff) << 16 | (p[3] & 0xff) << 8 | (p[4] & 0xff);
            int textLen = Math.min(len - 1, p.length - 6);
            language(java.util.Arrays.copyOfRange(p, 6, 6 + textLen));
            return;
        }
        log.warn("Unhandled TDS token 0x{} ({} bytes)", Integer.toHexString(p.length > 0 ? p[0] & 0xff : 0), p.length);
        ch.sendResponse(tokens().done(TdsTokens.DONE_FINAL, 0).bytes());
    }

    private void language(byte[] raw) throws IOException, InterruptedException {
        // ISO-8859-1 maps bytes 1:1, so lengths and offsets match the raw message.
        String cmd = new String(raw, StandardCharsets.ISO_8859_1).strip();
        String lower = cmd.toLowerCase(Locale.ROOT);
        if (trace) log.info("LTL <<< {}", cmd.length() > 4000 ? cmd.substring(0, 4000) + "...(" + cmd.length() + " chars)" : cmd);

        if (!lower.startsWith("connect source") && !lower.startsWith("get ")) {
            // LTL data: one or more complete "distribute" commands.
            listener.onLtl(raw);
            // Exactly one DONE per TDS message. This only lines up with RepAgent if the packet size it
            // asked for was confirmed at login (see login()).
            ch.sendResponse(tokens().done(TdsTokens.DONE_FINAL, 0).bytes());
        } else if (lower.startsWith("connect source")) {
            // connect source lti "SERVER"."db" 760 passthru
            Matcher cm = CONNECT_SOURCE.matcher(cmd);
            if (!cm.find()) throw new IOException("Unexpected connect source command: " + cmd);
            server = cm.group(1);
            database = cm.group(2);
            int proposed = Integer.parseInt(cm.group(3));
            int version;
            try {
                version = listener.onConnectSource(server, database, proposed);
            } catch (RuntimeException e) {
                log.error("Refusing connect source {}.{}: {}", server, database, e.getMessage());
                ch.sendResponse(tokens().message(32001, 16, e.getMessage(), SERVER_NAME).done(TdsTokens.DONE_ERROR, 0).bytes());
                return;
            }
            log.info("connect source {}.{} proposed LTL {} -> using {}", server, database, proposed, version);
            // Replication Server answers with two result sets: VERSION, then Sysversion + UpgradeLocater.
            ch.sendResponse(tokens()
                .rowFormat(VERSION_COLS).row(VERSION_COLS, version)
                .done(TdsTokens.DONE_MORE | TdsTokens.DONE_COUNT, 1)
                .rowFormat(SYSVERSION_COLS).row(SYSVERSION_COLS, RS_SYSVERSION, new byte[UPGRADE_LOCATOR_LEN])
                .done(TdsTokens.DONE_COUNT, 1).bytes());
        } else if (lower.startsWith("get maintenance user")) {
            String user = listener.maintenanceUser(server, database);
            ch.sendResponse(tokens().rowFormat(MAINT_COLS).row(MAINT_COLS, user)
                .done(TdsTokens.DONE_COUNT, 1).bytes());
        } else if (lower.startsWith("get truncation")) {
            byte[] tp = listener.truncationPoint(server, database);
            if (trace) log.info("get truncation -> 0x{}", HexFormat.of().formatHex(tp));
            ch.sendResponse(tokens().rowFormat(TRUNC_COLS).row(TRUNC_COLS, (Object) tp)
                .done(TdsTokens.DONE_COUNT, 1).bytes());
        } else {
            log.warn("Unknown command from RepAgent, answering DONE: {}", cmd);
            ch.sendResponse(tokens().done(TdsTokens.DONE_FINAL, 0).bytes());
        }
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
