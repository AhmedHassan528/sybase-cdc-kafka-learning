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
        // TODO 6 (parser checkpoints 1 to 7): the message is a sequence of "distribute" commands.
        //   - an empty token list gives an empty result;
        //   - if the first token is not the bare word "distribute", throw IllegalArgumentException;
        //   - then, until the tokens run out: remember the position (t.get(p).pos()) of the "distribute" word, skip it,
        //     and add command(start) to the result.
        throw new UnsupportedOperationException("increment 2: LtlParser.commands()");
    }

    private LtlCommand command(int start) {
        // TODO 7 (parser checkpoints 1 to 7): parse ONE command. The grammar is in the class comment above.
        //   1. Tags: while the next token is a number followed by a value: "1" = origin time (a date-time value),
        //      "4" = origin queue id (0x... hex), "6" = transaction id (0x... hex); skip a "," between tags.
        //   2. The kind, by the next bare word:
        //      begin    -> BEGIN: optional "system", optional "transaction", optional transaction name (a VALUE),
        //                  then optional "for" or "npw" followed by the user name (a VALUE);
        //      commit   -> COMMIT;   rollback -> ROLLBACK;
        //      applied  -> optional "owner" "=" <owner>, then <table> "." <function>; rs_insert / rs_update / rs_delete give
        //                  INSERT / UPDATE / DELETE, anything else OTHER. For a row change, after "yielding" read one
        //                  or two images ("before" and/or "after"), each with params(keys).
        //      for an UPDATE the after image only carries the changed columns: merge it over the before image so that
        //      `after` is the full new row (same column order as before).
        //      anything else -> OTHER.
        //   3. Skip tokens up to the next "distribute"; the raw text of this command is msg[start .. position of the
        //      next "distribute" (or the end)] as a stripped String.
        //   4. Return new LtlCommand(kind, originTime, oqid, tranId, owner, table, before, after, List.copyOf(keys), tranName, user, raw).
        throw new UnsupportedOperationException("increment 2: LtlParser.command()");
    }

    private Map<String, Object> params(List<String> keys) {
        // TODO 8 (parser checkpoints 1, 2, 5, 6): read "name = value, name = value ..." into a LinkedHashMap (keep the order).
        //   A name is a NAME token. If its marker is 'G' the column is part of the primary key: add it to `keys` once.
        //   After each name: expect "=", convert the next token with LtlValues.convert(next(), cs), skip an optional ",".
        throw new UnsupportedOperationException("increment 2: LtlParser.params()");
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
