package com.phoenix.cdc.sybase.ltl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.Charset;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * TCP listener that RepAgent connects to (the "Replication Server" in the
 * ASE interfaces file / sql.ini). One thread per RepAgent connection.
 */
public final class LtlServer implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(LtlServer.class);

    private final String host;
    private final int port;
    private final LtlListener listener;
    private final boolean trace;
    private final Charset charsetOverride;
    private final Set<Socket> clients = ConcurrentHashMap.newKeySet();
    private volatile ServerSocket serverSocket;
    private Thread acceptThread;

    public LtlServer(String host, int port, LtlListener listener, boolean trace, Charset charsetOverride) {
        this.host = host;
        this.port = port;
        this.listener = listener;
        this.trace = trace;
        this.charsetOverride = charsetOverride;
    }

    public void start() throws IOException {
        // TODO 1 (checkpoint 6): create a ServerSocket, set SO_REUSEADDR, bind it to host:port, keep it in the field
        //   serverSocket, start the accept thread (a daemon thread running acceptLoop) and log the listening port.
        //   A test asks for port 0, so log and name the thread with the port actually bound (ss.getLocalPort()).
        throw new UnsupportedOperationException("increment 1: LtlServer.start()");
    }

    /** The port actually bound (useful when the server was asked for port 0 in a test). */
    public int localPort() {
        return serverSocket.getLocalPort();
    }

    private void acceptLoop() {
        // TODO 2 (checkpoints 1 to 5): while the server socket is open, accept a client, set TCP_NODELAY and
        //   keep-alive, remember the socket in `clients`, and run `new LtlSession(s, listener, trace, charsetOverride).run()`
        //   on a new daemon thread (one thread per RepAgent connection). Remove the socket from `clients` when the
        //   session ends. Log (do not throw) an accept error unless the server is being closed.
        throw new UnsupportedOperationException("increment 1: LtlServer.acceptLoop()");
    }

    @Override
    public void close() {
        // TODO 3 (checkpoint 6): close the server socket, close every client socket in `clients`, wait up to 5 s for the
        //   accept thread to end, and log that the server stopped.
        throw new UnsupportedOperationException("increment 1: LtlServer.close()");
    }
}
