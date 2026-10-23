---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/ltl/LtlListener.java
---
purpose
  The LTL server speaks the protocol with RepAgent, but it must not decide what to do with the answers: who is allowed to log in, which protocol version to accept, where to resume, and what to do with the commands that arrive. LtlListener is the interface through which the server asks its owner those questions. In the finished connector the owner is the Kafka Connect task; the probe tool (a small debugging program) is a second owner.

class: LtlListener
  An interface: six methods that the owner implements. Each method is a question or a notification from one step of the RepAgent conversation, in the order they happen.

method: LtlListener.authenticate(String,String)
  "Is this user and password acceptable?" The server passes the login RepAgent sent (the user and password from sp_config_rep_agent) and the owner answers true or false.

method: LtlListener.onConnectSource(String,String,int)
  RepAgent sends "connect source" with the server, the database and the LTL version it proposes. The owner returns the version to use, which must not be higher than the proposal, or throws to refuse the connection.

method: LtlListener.maintenanceUser(String,String)
  RepAgent asks for the name of the maintenance user: the database user whose transactions it must not forward. The owner answers with a name (cdc_maint unless configured otherwise).

method: LtlListener.truncationPoint(String,String)
  The answer to RepAgent's "get truncation" question: the 36-byte position of the last change the connector has stored safely. RepAgent moves the database's log truncation point up to it. All zeros means "nothing stored yet".

method: LtlListener.onCommands(List)
  Called for every batch of parsed commands, in log order. It may block, and that is deliberate: while the owner is busy, the server stops reading, and RepAgent is slowed down (back-pressure) instead of the connector running out of memory.

method: LtlListener.onDisconnect(String,String,Exception)
  Called when the RepAgent connection closes, normally or with an error. It has an empty default body, because an owner is not required to react.

design
  Putting the questions behind an interface keeps the protocol code free of Kafka. The session can be tested with a fake owner, and the probe tool can use the same server without a Kafka Connect worker.

fits
  LtlSession calls these methods while it handles one RepAgent connection, and LtlServer hands the listener to every session it creates. The Kafka Connect task (SybaseCdcSourceTask) implements them in its inner class Listener, and the probe tool LtlProbe implements them with an anonymous class. LtlCommand is the type of the commands that onCommands receives.
