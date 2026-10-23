---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/ltl/LtlServer.java
---
purpose
  RepAgent needs an address to connect to. LtlServer is the listening socket at that address: it accepts every connection from RepAgent and starts one LtlSession for it on its own thread. In ASE terms it is the "Replication Server" the interfaces file points at.

class: LtlServer
  The server. It is AutoCloseable, so it can be stopped with try-with-resources or from the task's stop method. It remembers every client socket so that closing the server also closes the live connections.

method: LtlServer.<init>(String,int,LtlListener,boolean,Charset)
  Stores the host and port to listen on, the owner that answers the session's questions, the trace flag and the optional character set override. It opens nothing yet.

method: LtlServer.start()
  Opens the listening socket and starts the accept thread. The socket is bound with address reuse switched on, so that the connector can listen again right after a restart. The accept thread is a daemon thread named after the port. The log line "LTL server listening on host:port" that you saw in lesson 6.3 is written here, after the socket is bound.

method: LtlServer.acceptLoop()
  The loop of the accept thread: wait for a connection, switch on TCP no-delay and keep-alive, remember the socket, and start a session thread for it. When the session ends its socket is removed from the set. An error while accepting is logged unless the server is being closed.

method: LtlServer.close()
  Stops the server: closes the listening socket, closes every open client socket, waits up to five seconds for the accept thread to end and logs "LTL server on port N stopped". Closing the sockets is what makes RepAgent notice that the connector is gone.

lines: 39-48
  Opening the port in five steps: create the socket, allow reuse, bind to the address, start the accept thread and log. The binding can fail (for example when the port is taken), and then start throws and the task does not start.

lines: 57-65
  One thread per connection. There is normally exactly one RepAgent connection, so this is not about scale: it keeps the accept loop free to accept again and keeps each session's blocking reads separate.

design
  The server knows nothing about the protocol. It accepts sockets and hands them on, which keeps listening and conversing as two small classes.

env: ltl.listen.host
  The address the socket binds to (line 42). In the lab it is 0.0.0.0, every network interface of the connector's container.

env: ltl.listen.port
  The port the socket binds to (line 42). It must be the port in the database's interfaces entry for the replication server name; in the lab both say 11752.

fits
  LtlServer creates one LtlSession for each connection and passes it the LtlListener of its owner. The Kafka Connect task (SybaseCdcSourceTask) starts and stops the server, and the probe tool LtlProbe uses it as well.
