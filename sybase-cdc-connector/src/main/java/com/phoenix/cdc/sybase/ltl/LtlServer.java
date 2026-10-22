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
        ServerSocket ss = new ServerSocket();
        ss.setReuseAddress(true);
        ss.bind(new InetSocketAddress(host, port));
        serverSocket = ss;
        acceptThread = new Thread(this::acceptLoop, "ltl-accept-" + port);
        acceptThread.setDaemon(true);
        acceptThread.start();
        log.info("LTL server listening on {}:{}", host, port);
    }

    private void acceptLoop() {
        while (!serverSocket.isClosed()) {
            try {
                Socket s = serverSocket.accept();
                s.setTcpNoDelay(true);
                s.setKeepAlive(true);
                clients.add(s);
                Thread t = new Thread(() -> {
                    try {
                        new LtlSession(s, listener, trace, charsetOverride).run();
                    } finally {
                        clients.remove(s);
                    }
                }, "ltl-session-" + s.getRemoteSocketAddress());
                t.setDaemon(true);
                t.start();
            } catch (IOException e) {
                if (!serverSocket.isClosed()) log.warn("accept failed: {}", e.toString());
            }
        }
    }

    @Override
    public void close() {
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {
        }
        for (Socket s : clients) {
            try { s.close(); } catch (IOException ignored) { }
        }
        if (acceptThread != null) {
            try { acceptThread.join(5000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
        log.info("LTL server on port {} stopped", port);
    }
}
