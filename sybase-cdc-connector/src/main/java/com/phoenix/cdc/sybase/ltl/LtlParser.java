package com.phoenix.cdc.sybase.ltl;

import com.phoenix.cdc.sybase.ltl.LtlCommand.Kind;
import com.phoenix.cdc.sybase.ltl.LtlLexer.Token;
import com.phoenix.cdc.sybase.ltl.LtlLexer.Type;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Parses one LTL message (one or more "distribute" commands) from ASE 16 RepAgent, LTL 760.
 *
 * <pre>
 * distribute TAGS SUBCOMMAND
 * TAGS        := tag (, tag)*       tag := number value     1 = origin_time, 4 = origin_qid, 6 = tran_id
 * SUBCOMMAND  := begin transaction [name] [for user [- password]] [osid n]
 *              | commit transaction | rollback transaction
 *              | applied owner = owner table . function yielding [before PARAMS] [after PARAMS]
 *              | anything else (purge open_xact, DDL, markers ...)  -> Kind.OTHER
 * PARAMS      := name = value (, name = value)*
 * </pre>
 */
public final class LtlParser {

    private final byte[] msg;
    private final Charset cs;
    private final List<Token> t;
    private int p;

    private LtlParser(byte[] msg, Charset cs) {
        this.msg = msg;
        this.cs = cs;
        this.t = LtlLexer.tokenize(msg);
    }

    public static List<LtlCommand> parse(byte[] msg, Charset cs) {
        return new LtlParser(msg, cs).commands();
    }

    private List<LtlCommand> commands() {
        List<LtlCommand> out = new ArrayList<>();
        if (!t.isEmpty() && !t.get(0).isBare("distribute")) {
            throw new IllegalArgumentException("LTL message does not start with 'distribute': " + t.get(0));
        }
        while (p < t.size()) {
            int start = t.get(p).pos();
            p++; // "distribute"
            out.add(command(start));
        }
        return out;
    }

    private LtlCommand command(int start) {
        String originTime = null;
        byte[] oqid = null;
        byte[] tranId = null;

        // Command tags: "1 ~*6...,4 0x...,6 0x..."
        while (p + 1 < t.size() && t.get(p).type() == Type.BARE && isNumber(t.get(p))) {
            String tag = t.get(p).text(StandardCharsets.ISO_8859_1);
            Token v = t.get(p + 1);
            p += 2;
            switch (tag) {
                case "1" -> originTime = v.type() == Type.VALUE ? LtlValues.dateTime(v.text(StandardCharsets.ISO_8859_1)) : v.text(StandardCharsets.ISO_8859_1);
                case "4" -> oqid = hex(v);
                case "6" -> tranId = hex(v);
                default -> { }
            }
            if (!skipSym(',')) break;
        }

        Kind kind = Kind.OTHER;
        String owner = null, table = null, tranName = null, user = null;
        Map<String, Object> before = null, after = null;
        List<String> keys = new ArrayList<>();

        if (atBare("begin")) {
            p++;
            if (atBare("system")) p++;
            if (atBare("transaction")) p++;
            kind = Kind.BEGIN;
            if (p < t.size() && t.get(p).type() == Type.VALUE) tranName = t.get(p++).text(cs);
            // "for ~\"#sa-~#..." (user + password hash) or "npw ~\"#sa" (user, no password)
            if (atBare("for") || atBare("npw")) {
                p++;
                if (p < t.size() && t.get(p).type() == Type.VALUE) user = t.get(p++).text(cs);
            }
        } else if (atBare("commit")) {
            kind = Kind.COMMIT;
        } else if (atBare("rollback")) {
            kind = Kind.ROLLBACK;
        } else if (atBare("applied")) {
            p++;
            if (atBare("owner")) {
                p++;
                skipSym('=');
                owner = next().text(cs);
            }
            table = next().text(cs);
            skipSym('.');
            String function = next().text(StandardCharsets.ISO_8859_1);
            kind = switch (function.toLowerCase()) {
                case "rs_insert" -> Kind.INSERT;
                case "rs_update" -> Kind.UPDATE;
                case "rs_delete" -> Kind.DELETE;
                default -> Kind.OTHER;
            };
            if (kind != Kind.OTHER && atBare("yielding")) {
                p++;
                while (atBare("before") || atBare("after")) {
                    boolean isBefore = atBare("before");
                    p++;
                    Map<String, Object> image = params(keys);
                    if (isBefore) before = image; else after = image;
                }
                if (kind == Kind.UPDATE && before != null && after != null) {
                    // RepAgent sends only the changed columns in the after image; rebuild the full row.
                    Map<String, Object> full = new LinkedHashMap<>(before);
                    full.putAll(after);
                    after = full;
                }
            }
        }

        // Skip to the next command; anything we did not use stays in "raw" for logging.
        while (p < t.size() && !t.get(p).isBare("distribute")) p++;
        int end = p < t.size() ? t.get(p).pos() : msg.length;
        String raw = new String(msg, start, end - start, cs).strip();
        return new LtlCommand(kind, originTime, oqid, tranId, owner, table, before, after,
            List.copyOf(keys), tranName, user, raw);
    }

    private Map<String, Object> params(List<String> keys) {
        Map<String, Object> m = new LinkedHashMap<>();
        while (p < t.size() && t.get(p).type() == Type.NAME) {
            Token name = t.get(p++);
            String col = name.text(cs);
            if (name.marker() == 'G' && !keys.contains(col)) keys.add(col);
            expectSym('=');
            m.put(col, LtlValues.convert(next(), cs));
            skipSym(',');
        }
        return m;
    }

    private static boolean isNumber(Token tk) {
        String s = tk.text(StandardCharsets.ISO_8859_1);
        return !s.isEmpty() && s.chars().allMatch(Character::isDigit);
    }

    private static byte[] hex(Token v) {
        String s = v.text(StandardCharsets.ISO_8859_1);
        if (!s.startsWith("0x")) return null;
        String h = s.substring(2);
        if ((h.length() & 1) == 1) h = "0" + h;
        return HexFormat.of().parseHex(h);
    }

    private boolean atBare(String w) {
        return p < t.size() && t.get(p).isBare(w);
    }

    private Token next() {
        if (p >= t.size()) throw new IllegalArgumentException("unexpected end of LTL message");
        return t.get(p++);
    }

    private void expectSym(char c) {
        if (!skipSym(c)) throw new IllegalArgumentException("expected '" + c + "' at " + (p < t.size() ? t.get(p) : "end"));
    }

    private boolean skipSym(char c) {
        if (p < t.size() && t.get(p).isSym(c)) { p++; return true; }
        return false;
    }
}
