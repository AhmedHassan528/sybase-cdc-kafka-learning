---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/ltl/LtlParser.java
---
purpose
  One LTL message from RepAgent can hold several "distribute" commands. LtlParser reads the token list the lexer produced and builds one LtlCommand per command: it finds the origin time, the log position and the transaction id in the tags, decides whether the step is a begin, a commit, a rollback or a row change, reads the table and the before and after rows, and keeps the original text for logging.

class: LtlParser
  A small recursive-descent parser. It holds the message, the character set, the token list and a position pointer p that every helper moves forward. The constructor is private; the static parse method is the only entry.

method: LtlParser.<init>(byte[],Charset)
  Private constructor: stores the message and the character set and runs the lexer, so a parser object always starts with its tokens ready.

method: LtlParser.parse(byte[],Charset)
  The public entry point: parse one message into a list of commands.

method: LtlParser.commands()
  Loops over the message. The message must start with the word distribute, otherwise it is rejected with an IllegalArgumentException. Each distribute starts one command, which the command method reads.

method: LtlParser.command(int)
  Reads one command. First the numbered tags (1 is the origin time, 4 the log position, 6 the transaction id), then the sub-command: begin, commit, rollback, or "applied", which is a row change. For a row change it reads the owner, the table and the function name (rs_insert, rs_update, rs_delete) and then the before and after images. Anything it does not understand becomes Kind.OTHER, never an error, so DDL, markers and other housekeeping pass through without stopping the connector.

method: LtlParser.params(List)
  Reads a list of "name = value" pairs into an ordered map, converting each value with LtlValues. A name that RepAgent flagged as a primary key column is added to the key list.

method: LtlParser.isNumber(LtlLexer.Token)
  True if a token consists only of digits. The tag numbers are recognised with it.

method: LtlParser.hex(LtlLexer.Token)
  Turns a token like 0x0a1b into bytes; null when it does not start with 0x. An odd number of digits gets a leading zero.

method: LtlParser.atBare(String)
  Looks at the current token without consuming it: is it this keyword?

method: LtlParser.next()
  Returns the current token and moves on. A message that ends too early is an error.

method: LtlParser.expectSym(char)
  Consumes a required symbol, or throws with the position when it is missing.

method: LtlParser.skipSym(char)
  Consumes an optional symbol and says whether it was there.

lines: 63-75
  The tags. They come as "number value" pairs separated by commas: 1 is the time at the origin, 4 is the origin queue id (the position of this record in the log), 6 is the transaction id. The loop stops at the first token that is not a tag.

lines: 82-92
  A begin command. The transaction name and the database user are optional, which is why each is checked before it is read. The user is the one who started the transaction.

lines: 97-128
  A row change. The function name decides the kind. Each of the before and after images is read with params, and a delete has only a before image, an insert only an after image.

lines: 121-126
  The merge that makes an update easy to use later. RepAgent sends every column in the before image but only the changed columns in the after image, so the parser starts from the before row and overlays the after columns, which gives the full new row.

lines: 143
  The primary key columns are recognised by the column flag G that the lexer read with the name. They end up in keyColumns and later become the Kafka message key.

lines: 131-135
  Whatever the parser did not use stays available as the raw text of the command, so a log line can show exactly what arrived.

design
  The parser is lenient about what it does not need (OTHER commands, optional parts) and strict about what it relies on (the message must begin with distribute, and symbols and lengths must be well formed). A malformed message is an exception, which stops the session and is visible in the log, rather than a silently wrong event.

fits
  LtlSession calls parse for every LTL message it receives from RepAgent and passes the resulting commands on. LtlParser uses LtlLexer to cut the bytes into tokens, LtlValues to convert values and LtlCommand as its result type.
