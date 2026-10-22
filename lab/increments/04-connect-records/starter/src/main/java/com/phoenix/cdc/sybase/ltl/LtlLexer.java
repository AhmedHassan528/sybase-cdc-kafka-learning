package com.phoenix.cdc.sybase.ltl;

import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Tokenizer for LTL 760 as sent by ASE 16 RepAgent (learned from captures, see GUIDE.md).
 *
 * <pre>
 * BARE   words and plain values, ended by whitespace or , = . ~
 *        distribute  applied  rs_insert  NULL  255  -32768  0x0000...
 * SYM    one of  ,  =  .
 * VALUE  ~ marker length data   length-prefixed literal, e.g. ~"(payment  (char, 7 bytes)
 * NAME   ~ flag length name     column name in a yielding list, e.g. ~G#id (flag G = primary key)
 * </pre>
 *
 * Lengths are base-64 digits starting at '!' (0x21): '(' = 7, '"!' = 1*64+0 = 64.
 * Most markers take one length digit; the variable-length types switch marker
 * as the value grows (see {@link #lengthDigits}). Lengths count bytes, so the
 * lexer works on the raw message, not on decoded text.
 */
public final class LtlLexer {

    public enum Type { BARE, SYM, VALUE, NAME }

    /** A token. For VALUE, {@code marker} is the datatype marker; for NAME it is the column flag. */
    public record Token(Type type, char marker, byte[] data, int pos) {

        public String text(Charset cs) {
            return new String(data, cs);
        }

        public boolean isBare(String w) {
            return type == Type.BARE && new String(data, java.nio.charset.StandardCharsets.ISO_8859_1).equalsIgnoreCase(w);
        }

        public boolean isSym(char c) {
            return type == Type.SYM && marker == c;
        }

        @Override
        public String toString() {
            String d = new String(data, java.nio.charset.StandardCharsets.ISO_8859_1);
            return type + (marker != 0 ? "(" + marker + ")" : "") + "[" + (d.length() > 40 ? d.substring(0, 40) + "..." : d) + "]@" + pos;
        }
    }

    private LtlLexer() {}

    /**
     * Number of base-64 length digits after a value marker. char/varchar, binary and
     * unichar use a different marker for 1, 2 and 3 digits; every other type uses one digit.
     */
    static int lengthDigits(char marker) {
        return switch (marker) {
            case '#', '-', '7' -> 2;
            case '9', ':', '<' -> 3;
            default -> 1;
        };
    }

    public static List<Token> tokenize(byte[] b) {
        List<Token> out = new ArrayList<>();
        int i = 0;
        int n = b.length;
        boolean inYielding = false;   // between "yielding" and the next "distribute"
        while (i < n) {
            int c = b[i] & 0xff;
            if (c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == 0) { i++; continue; }
            int start = i;
            if (c == ',' || c == '=' || c == '.') {
                out.add(new Token(Type.SYM, (char) c, new byte[] {(byte) c}, start));
                i++;
            } else if (c == '~') {
                if (i + 2 >= n) throw new IllegalArgumentException("truncated ~ token at " + i);
                char marker = (char) (b[i + 1] & 0xff);
                if (expectsName(out, inYielding)) {
                    // ~<flag><1 digit><name> followed by '='
                    int len = (b[i + 2] & 0xff) - 0x21;
                    int end = i + 3 + len;
                    if (len >= 0 && end < n && b[end] == '=') {
                        out.add(new Token(Type.NAME, marker, Arrays.copyOfRange(b, i + 3, end), start));
                        i = end;
                        continue;
                    }
                }
                int digits = lengthDigits(marker);
                if (i + 2 + digits > n) throw new IllegalArgumentException("truncated length at " + i);
                int len = 0;
                for (int d = 0; d < digits; d++) {
                    int v = (b[i + 2 + d] & 0xff) - 0x21;
                    if (v < 0 || v > 63) throw new IllegalArgumentException("bad length digit at " + (i + 2 + d));
                    len = len * 64 + v;
                }
                int from = i + 2 + digits;
                if (from + len > n) throw new IllegalArgumentException("value runs past end of message at " + i);
                out.add(new Token(Type.VALUE, marker, Arrays.copyOfRange(b, from, from + len), start));
                i = from + len;
            } else {
                while (i < n) {
                    int d = b[i] & 0xff;
                    if (d == ' ' || d == '\t' || d == '\r' || d == '\n' || d == 0 || d == ',' || d == '=' || d == '~') break;
                    if (d == '.' && !(i > start && Character.isDigit(b[i - 1]) && i + 1 < n && Character.isDigit(b[i + 1]))) break;
                    i++;
                }
                Token t = new Token(Type.BARE, (char) 0, Arrays.copyOfRange(b, start, i), start);
                if (t.isBare("yielding")) inYielding = true;
                else if (t.isBare("distribute")) inYielding = false;
                out.add(t);
            }
        }
        return out;
    }

    /** Column names follow "before"/"after", or a comma inside a yielding list (not in command tags). */
    private static boolean expectsName(List<Token> out, boolean inYielding) {
        if (out.isEmpty() || !inYielding) return false;
        Token prev = out.get(out.size() - 1);
        return prev.isBare("before") || prev.isBare("after") || prev.isSym(',');
    }
}
