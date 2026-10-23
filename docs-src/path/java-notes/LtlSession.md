---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/ltl/LtlSession.java
---
purpose
  LtlSession is the connector playing the part of a Replication Server for one RepAgent connection. It reads the messages RepAgent sends, answers each one the way a real Replication Server would, and hands the parsed change commands to its owner. It is the class that makes RepAgent believe the connector is a Replication Server, and it holds all the protocol detail of that conversation: the login, the version agreement, the two questions RepAgent asks, and the batches of changes.

class: LtlSession
  A package-private Runnable, run on its own thread by LtlServer, one thread per connection. It keeps the connection state: the channel, the byte order and character set agreed at login, and the server and database names from "connect source".

method: LtlSession.<init>(Socket,LtlListener,boolean,Charset)
  Stores the socket, the owner (the listener), the trace flag and an optional character set that overrides the one in the login. Nothing is read yet.

method: LtlSession.run()
  The loop of the session. It wraps the socket in a TdsChannel and reads messages until the stream ends, and for each one it picks a handler by packet type: login, language (old style), token stream (the normal case), attention (answered with a DONE that says "attention"), and anything else, which gets a warning in the log and an empty DONE. Whatever ends the loop, normally or with an error, the finally block tells the owner through onDisconnect. An interruption restores the interrupt flag; any other exception is logged as a warning and passed on as the cause.

method: LtlSession.login(byte[])
  Handles the TDS login. It parses the record with TdsLogin, takes over the byte order and the character set, logs the login (the line you saw in lesson 6.3) and asks the owner to check the user and password. A wrong login gets an error message (4002), a failed login acknowledgement and an error DONE, and a warning in the log. A good login gets a successful acknowledgement, the capability token echoed back, a confirmation of the packet size RepAgent asked for, and a final DONE; only then does the channel start using that packet size.

method: LtlSession.tokenStream(byte[])
  Handles the normal TDS 5.0 message. The connector only expects one token in it, LANGUAGE (id 0x21), which carries a length (in the byte order of the login) and the text of an LTL command. It unpacks the text and passes it to language. Any other token gets a warning and an empty DONE.

method: LtlSession.language(byte[])
  The dispatcher of the conversation, decided by the start of the command text. "connect source" is parsed with a regular expression for the server, the database and the proposed version, the owner chooses the version, and the answer is two small result sets: the version, then the claimed server version and a 36-byte locator of zeros. "get maintenance user" is answered with one row holding the user name. "get truncation" is answered with one row holding the 36-byte position the owner has stored. Anything else that does not start with "connect source" or "get " is LTL data: one or more distribute commands, parsed and handed to the owner, then answered with exactly one DONE. A command it does not know gets a warning and an empty DONE.

method: LtlSession.dump(TdsChannel.Message)
  A debugging aid: when the system property ltl.dump.dir is set, every message from RepAgent is saved to a numbered file, so the exact bytes of a new ASE version can be studied offline. It does nothing otherwise.

method: LtlSession.tokens()
  Creates a fresh token builder in the byte order and character set agreed at login.

method: LtlSession.javaCharset(String)
  Translates a Sybase character set name from the login into a Java one: utf8, cp1256, cp1252, cp850 and iso_1 are mapped explicitly, any other name is tried as a Java name, and ISO-8859-1 is the fallback.

method: LtlSession.hex(byte[],int)
  Formats up to a number of bytes as hexadecimal text for log lines.

lines: 38-39
  Two values that are fixed in the code: the replication server name used in error messages (CDC_RS) and the optional directory for dumping every message (a system property, off by default).

lines: 42-44
  The version of a Replication Server that the connector claims to be (1600, meaning 16.0), and the length of the locator RepAgent expects: 36 bytes. RepAgent uses the first only for compatibility checks.

lines: 87-97
  The dispatch by TDS packet type. The login packet starts a session, the normal packet carries the commands, and an attention packet is answered rather than ignored.

lines: 118-127
  The login decision. The check itself belongs to the owner; the session only reports it to RepAgent in the way RepAgent understands: an error message plus a failed acknowledgement.

lines: 130-135
  A subtle but important detail: the packet size RepAgent asked for is confirmed at login. The comment explains what goes wrong otherwise: the client library falls back to small packets and splits RepAgent's buffers at the wrong places, which breaks the rule "one DONE per message".

lines: 164-170
  What happens with a message that cannot be parsed: the connector never acknowledges what it did not understand. LTL batches get no reply, so the only way to refuse one is to drop the connection. RepAgent then reconnects and sends again from the last position the connector reported.

lines: 172-176
  Exactly one DONE for each TDS message. The comment spells out the failure mode if the answers and the messages ever get out of step: RepAgent reads the extra DONE as the answer to its next question and aborts.

lines: 194-198
  The two result sets of the answer to "connect source": first the agreed version, then the server version and the locator of zeros. Both are built with the token builder.

design
  The session does the protocol and nothing else. Every decision that depends on the environment (the user and password, the version, the maintenance user, the position to resume from, what to do with the commands) is delegated to the listener, so the same session class runs in the Kafka Connect task and in the probe tool.

env: ltl.username
  The user name from the login record is passed to the owner's authenticate method (line 118); the owner compares it with the configured ltl.username.

env: ltl.password
  The password from the login record is passed to the owner's authenticate method (line 118); the owner compares it with the configured ltl.password. It is never written to the log.

env: ltl.charset
  An optional character set that overrides the one in the login (line 114). Empty by default, which means: use what the login says.

env: ltl.trace
  When true, the session logs every packet header, every LTL command and the answers (lines 79 and 140 and others). It is off in the lab.

env: replication.server.name
  The name CDC_RS appears in error messages the session sends (line 38). It should match the name of the interfaces entry and of the RepAgent's rs servername setting.

env: ltl.dump.dir
  A system property (-Dltl.dump.dir=/some/dir) that makes the session save every message from RepAgent to that directory (line 39). It is not set in the lab.

fits
  LtlSession wraps each connection in a TdsChannel, parses the login with TdsLogin, builds every answer with TdsTokens, parses LTL data with LtlParser and passes the resulting LtlCommand objects to the owner through LtlListener. LtlServer creates one LtlSession per RepAgent connection and runs it on its own thread.
