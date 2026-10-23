---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/ltl/LtlValues.java
---
purpose
  A value in LTL carries a one-character type marker and its text, for example a number as text, a money amount with a dollar sign, or a date as eight digits. LtlValues converts such a token into the Java value that goes into the change event: a number, a string, a byte array or null. Its main rule is that exact decimals stay strings, so money never passes through floating point.

class: LtlValues
  A package-private utility class of static methods. Nobody creates it. It also keeps a small static set so that an unknown marker is reported once, not on every row.

method: LtlValues.<init>()
  Private and empty, to stop anyone from creating an instance.

method: LtlValues.convert(LtlLexer.Token,Charset)
  The conversion. A bare word becomes null if it is the word NULL, otherwise a long when it is a whole number (and the text itself when it is not). A length-prefixed value is converted by its marker: character types become strings in the connection's character set, unicode types are decoded as UTF-16, binary types stay a byte array (the JSON converter later writes it as base64), numeric and money types stay exact strings, floating point types become doubles, and the date and time types become ISO text. An unknown marker is logged once and its value is passed on as text, so one new type never stops the pipeline.

method: LtlValues.date(String)
  Turns eight digits (20261020) into a date with dashes (2026-10-20); any other length is returned unchanged.

method: LtlValues.dateTime(String)
  Turns "20261020 13:45:56:123" into "2026-10-20T13:45:56.123", built from the date and time methods. Anything too short or without the space is returned unchanged.

method: LtlValues.decimal(String)
  Removes a dangling decimal point. ASE sends a number like 100.00 as "100." and 100.50 as "100.5", so the trailing zeros are gone and a lone dot can remain. This is why the amount 10.00 of the demonstration arrives as "10".

method: LtlValues.time(String)
  ASE writes a time with a colon before the milliseconds (13:45:56:000); this turns that colon into a dot, the ISO form.

lines: 17-31
  The table of every marker the connector understands: the type of the column in ASE, how a value of that type looks on the wire, and the Java value it becomes. It was assembled from real RepAgent traffic.

lines: 49-75
  The switch on the marker. Several markers share one case because they differ only in how long the value is (the lexer already handled the length).

lines: 58-60
  Money values arrive with a leading dollar sign, which is removed before the number is kept as an exact string.

design
  Decimals and money are kept as strings. A JSON number is read as a 64-bit float by most programs, which cannot hold every numeric(18,4) value exactly and lets money drift by a fraction of a cent. The consumer decides how to turn the string into a number.

fits
  LtlParser calls convert for every value of a before or after image. LtlValues reads the tokens that LtlLexer produced and returns plain Java objects, so the rest of the connector never sees a marker.
