---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/tools/LtlProbe.java
---
purpose
  LtlProbe is a discovery tool, not part of the running connector: a stand-alone fake Replication Server that involves no Kafka at all. It was used to find out what RepAgent really sends. It prints every command, prints each transaction when it commits, and acknowledges every commit at once so that the database log keeps being freed. It ships in the same JAR but Kafka Connect never calls it.

class: LtlProbe
  A final class with only a main method. It builds an LtlServer and gives it a listener, an anonymous class defined inside main.

class: LtlProbe.1
  The anonymous class that implements LtlListener for the probe. It uses the variables of main (the user, the password, the buffer and the last position seen).

method: LtlProbe.<init>()
  The implicit constructor of the class; nobody creates it.

method: LtlProbe.main(String[])
  Takes an optional port, user and password (11752, rs_user and rs_password by default), creates a transaction buffer and the anonymous listener, starts an LtlServer on every interface with tracing on, adds a shutdown hook that closes it, and then waits forever. The class comment shows the command to run it inside the Connect container.

method: LtlProbe.1.<init>()
  The implicit constructor of the anonymous class.

method: LtlProbe.1.authenticate(String,String)
  Prints the login and whether the password was right, and accepts only the given user and password.

method: LtlProbe.1.maintenanceUser(String,String)
  Always answers cdc_maint.

method: LtlProbe.1.onCommands(List)
  For every command: finds the log position in the raw text with a regular expression and remembers the highest one seen, prints the command (and, for a row change, the table and the before and after images), and feeds it to the transaction buffer, printing a line when a transaction commits.

method: LtlProbe.1.onConnectSource(String,String,int)
  Prints the connect request and agrees to whatever version RepAgent proposes.

method: LtlProbe.1.onDisconnect(String,String,Exception)
  Prints the disconnect and clears the buffer.

method: LtlProbe.1.truncationPoint(String,String)
  Answers "get truncation" with the highest position seen so far, understood or not: this is discovery, so the database log is allowed to move on.

lines: 24-25
  The regular expression that finds the origin queue id tag (tag 4) in the raw LTL text, so that the probe can acknowledge positions even for commands the parser did not fully understand.

design
  The probe shows that the protocol code does not depend on Kafka: the same LtlServer and LtlSession serve the real task and this tool, only the listener differs.

env: ltl.listen.port
  The port is the first command-line argument of main (default 11752, line 28).

env: ltl.username
  The user is the second argument (default rs_user, line 29).

env: ltl.password
  The password is the third argument (default rs_password, line 30).

fits
  LtlProbe uses LtlServer and implements LtlListener, with LtlCommand objects, a TransactionBuffer and Oqid helpers. It is a second owner of the LTL server, next to the Kafka Connect task.
