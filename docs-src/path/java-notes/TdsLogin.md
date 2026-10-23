---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/tds/TdsLogin.java
---
purpose
  When RepAgent connects, its first message is a TDS login record: a fixed-layout block of bytes that says who is logging in, from where and with what settings. TdsLogin turns that block into a Java object with readable fields: the user, the password, the character set, the packet size and the byte order the client wants.

class: TdsLogin
  An immutable value object. Its fields are public and final because the object is only read after parsing. The only way to make one is the static parse method.

method: TdsLogin.<init>(byte[])
  Private constructor that does the real work: it reads each field from its fixed place in the record (the numbers are offsets in the record), decides the byte order, reads the packet size and looks for the capability token. Because it is private, a TdsLogin is always a parsed login and never half-filled.

method: TdsLogin.parse(byte[])
  The public way in. It simply calls the constructor; having a named factory keeps the call site readable (`TdsLogin.parse(message.payload())`).

method: TdsLogin.field(byte[],int,int)
  Reads one text field. Each name field in the record is 30 bytes of space followed by one byte that holds the real length; this method reads that length byte (capped at the field size) and decodes that many bytes as ISO-8859-1. A record that is too short for the field gives an empty string instead of an error.

method: TdsLogin.findCapability(byte[])
  Finds the CAPABILITY token at the end of the login record. It scans from byte 400 for the token marker 0xE2 and accepts it only if the length that follows, read in either byte order, lands exactly on the end of the packet. This avoids mistaking a stray 0xE2 inside a name for the token. It returns the token bytes, or null.

method: TdsLogin.toString()
  A one-line summary of the login without the password. This is what produces the `TdsLogin{host=, user=rs_user, ...}` line you saw in the connector's log in lesson 6.3.

lines: 31-33
  The three most important fields: host name, user and password sit at fixed offsets 0, 31 and 62, each 30 bytes. The user and the password are what the connector checks against its configuration.

lines: 34
  The byte order for the answers. The client states it in a single byte (2 means big-endian); anything else is treated as little-endian. TdsTokens writes every integer it sends in this order.

lines: 40-42
  The packet size arrives as text, six bytes wide. If it cannot be read as a number, 512 is used, which is the smallest legal TDS packet size.

design
  Parsing is separated from checking. TdsLogin only says what the client sent; it does not decide whether the login is acceptable. LtlSession compares the user and password with the connector's configuration, so a wrong password is a policy decision in one place and not hidden in a parser.

fits
  TdsLogin is used by LtlSession, which parses the first message of every connection with it and then checks the user and password against the connector's configuration (the user and password are the environment-dependent values of that check, described in the LtlSession lesson). It reads the bytes that the packet channel delivered, and the echo of the capability token is written by the token builder of the same package.
