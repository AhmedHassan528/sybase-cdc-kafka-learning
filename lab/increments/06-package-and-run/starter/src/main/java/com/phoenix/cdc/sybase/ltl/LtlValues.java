package com.phoenix.cdc.sybase.ltl;

import com.phoenix.cdc.sybase.ltl.LtlLexer.Token;
import com.phoenix.cdc.sybase.ltl.LtlLexer.Type;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Converts LTL 760 value tokens to Java values for the change event.
 *
 * <pre>
 * marker  ASE type                     example on the wire        Java value
 * bare    int/smallint/tinyint/bigint  255                        Long
 * bare    bit                          1                          Long
 * bare    NULL                         NULL                       null
 * " # 9   char/varchar/text-ish        ~"$abc                     String (connection charset)
 * 6 7 <   unichar/univarchar           ~6'\0u\0n\0i               String (UTF-16BE)
 * , - :   binary/varbinary             ~,%&lt;4 raw bytes&gt;           byte[] (base64 in JSON)
 * % 0     numeric/decimal              ~%+12345.6789              String, exact
 * ( )     money/smallmoney             ~(+$1234.5678              String, exact, '$' removed
 * &amp; '     float/real                   ~&amp;13.14159265358979        Double
 * *       datetime                     ~*620261020 13:45:56:123   "2026-10-20T13:45:56.123"
 * +       smalldatetime                ~+620261020 13:45:00:000   "2026-10-20T13:45:00.000"
 * =       date                         ~=)20261020                "2026-10-20"
 * &gt;       time                         ~&gt;-13:45:56:000           "13:45:56.000"
 * E       bigdatetime                  ~E920261020 13:45:56.123456 "2026-10-20T13:45:56.123456"
 * </pre>
 * Decimals stay strings so money never goes through floating point.
 */
final class LtlValues {

    private static final Logger log = LoggerFactory.getLogger(LtlValues.class);
    private static final Set<Character> warned = ConcurrentHashMap.newKeySet();

    private LtlValues() {}

    static Object convert(Token t, Charset cs) {
        if (t.type() == Type.BARE) {
            String s = t.text(StandardCharsets.ISO_8859_1);
            if (s.equalsIgnoreCase("NULL")) return null;
            try { return Long.parseLong(s); } catch (NumberFormatException e) { return s; }
        }
        String s;
        switch (t.marker()) {
            case '"', '#', '9':
                return t.text(cs);
            case '6', '7', '<':
                return t.text(StandardCharsets.UTF_16BE);
            case ',', '-', ':':
                return t.data();
            case '%', '0':
                return decimal(t.text(StandardCharsets.ISO_8859_1));
            case '(', ')':
                s = t.text(StandardCharsets.ISO_8859_1);
                return decimal(s.startsWith("$") ? s.substring(1) : s);
            case '&', '\'':
                s = t.text(StandardCharsets.ISO_8859_1);
                try { return Double.parseDouble(s); } catch (NumberFormatException e) { return s; }
            case '*', '+', 'E':
                return dateTime(t.text(StandardCharsets.ISO_8859_1));
            case '=':
                return date(t.text(StandardCharsets.ISO_8859_1));
            case '>':
                return time(t.text(StandardCharsets.ISO_8859_1));
            default:
                if (warned.add(t.marker())) {
                    log.warn("Unknown LTL value marker '{}' - passing value through as text", t.marker());
                }
                return t.text(cs);
        }
    }

    /** ASE sends numeric(18,2) 100.00 as "100." and 100.50 as "100.5"; drop a dangling '.'. */
    static String decimal(String s) {
        return s.endsWith(".") ? s.substring(0, s.length() - 1) : s;
    }

    /** "20261020 13:45:56:123" or "20261020 13:45:56.123456" -> "2026-10-20T13:45:56.123[456]". */
    static String dateTime(String s) {
        if (s.length() < 17 || s.charAt(8) != ' ') return s;
        return date(s.substring(0, 8)) + "T" + time(s.substring(9));
    }

    static String date(String s) {
        if (s.length() != 8) return s;
        return s.substring(0, 4) + "-" + s.substring(4, 6) + "-" + s.substring(6, 8);
    }

    /** "13:45:56:000" -> "13:45:56.000" (ASE uses ':' before milliseconds). */
    static String time(String s) {
        if (s.length() >= 9 && s.charAt(8) == ':') return s.substring(0, 8) + "." + s.substring(9);
        return s;
    }
}
