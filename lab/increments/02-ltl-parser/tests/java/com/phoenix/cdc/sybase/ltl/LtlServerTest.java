package com.phoenix.cdc.sybase.ltl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Increments 1 and 2: the listener RepAgent connects to, and what it does with the LTL it receives.
 * Checkpoints 1 to 6 are increment 1 (they must keep passing); checkpoint 7 is new in increment 2.
 *
 * The tests play the part of RepAgent. They replay packets captured from a real ASE 16.0 RepAgent
 * (src/test/resources, taken from captures/raw of the finished project), so what passes here is what the real thing
 * sends. Each test is a checkpoint; work through them in order.
 */
@Timeout(30)
class LtlServerTest {

    /** Captured RepAgent messages, in the order RepAgent sent them. */
    private static final String LOGIN = "000001-02.bin";            // TDS login packet, user rs_user / rs_password
    private static final String CONNECT_SOURCE = "000002-0f.bin";   // connect source lti "MYSYBASE"."phoenix_test" 760 passthru
    private static final String GET_MAINT_USER = "000003-01.bin";   // get maintenance user for ...
    private static final String GET_TRUNCATION = "000004-01.bin";   // get truncation ...
    private static final String DISTRIBUTE = "000005-01.bin";       // distribute 1 ... (real LTL text)

    private static final int PKT_LANGUAGE = 0x01, PKT_LOGIN = 0x02, PKT_NORMAL = 0x0F;
    private static final byte[] TRUNCATION = new byte[36];

    static {
        for (int i = 0; i < TRUNCATION.length; i++) TRUNCATION[i] = (byte) (i + 1);
    }

    // ---------------------------------------------------------------------------------------------------------

    @Test
    void checkpoint1_loginWithTheCapturedRepAgentPacketIsAccepted() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            byte[] reply = agent.exchange(PKT_LOGIN, resource(LOGIN));

            assertEquals("rs_user", rec.loginUser, "the user name from the login packet must reach authenticate()");
            assertEquals("rs_password", rec.loginPassword, "the password from the login packet must reach authenticate()");
            assertEquals(5, loginAckStatus(reply), "LOGINACK status 5 = login succeeded");
        }
    }

    @Test
    void checkpoint2_aWrongPasswordIsRefused() throws Exception {
        Recorder rec = new Recorder("rs_user", "something-else");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            byte[] reply = agent.exchange(PKT_LOGIN, resource(LOGIN));

            assertEquals(6, loginAckStatus(reply), "LOGINACK status 6 = login failed");
        }
    }

    @Test
    void checkpoint3_connectSourceIsPassedToTheListenerAndAnswered() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            byte[] reply = agent.exchange(PKT_NORMAL, resource(CONNECT_SOURCE));

            assertEquals("MYSYBASE", rec.sourceServer);
            assertEquals("phoenix_test", rec.sourceDatabase);
            assertEquals(760, rec.proposedVersion, "RepAgent proposes LTL version 760");
            assertTrue(contains(reply, ascii("Sysversion")), "the second result set must carry the column Sysversion");
            assertTrue(contains(reply, new byte[] {(byte) 0xF8, 0x02, 0x00, 0x00}),
                "the negotiated version 760 must be sent as a little-endian 4-byte integer");
        }
    }

    @Test
    void checkpoint4_maintenanceUserAndTruncationPointAreAnswered() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            agent.exchange(PKT_NORMAL, resource(CONNECT_SOURCE));
            byte[] maint = agent.exchange(PKT_LANGUAGE, resource(GET_MAINT_USER));
            byte[] trunc = agent.exchange(PKT_LANGUAGE, resource(GET_TRUNCATION));

            assertTrue(contains(maint, ascii("cdc_maint")), "the reply to 'get maintenance user' must carry the user name");
            assertTrue(contains(trunc, TRUNCATION), "the reply to 'get truncation' must carry the 36-byte locator");
        }
    }

    @Test
    void checkpoint5_ltlBatchesAreAcknowledged() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            byte[] reply = agent.exchange(PKT_LANGUAGE, resource(DISTRIBUTE));

            assertEquals(1, rec.batches.size(), "one TDS message = one call to onCommands()");
            assertTrue(contains(reply, new byte[] {(byte) 0xFD}), "the batch must be answered with exactly one DONE token (0xFD)");
        }
    }

    @Test
    void checkpoint7_parsedCommandsReachTheListener() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            agent.exchange(PKT_LANGUAGE, resource(DISTRIBUTE));

            List<LtlCommand> cmds = rec.batches.get(0);
            assertFalse(cmds.isEmpty(), "the captured batch contains at least one distribute command");
            assertEquals(LtlCommand.Kind.BEGIN, cmds.get(0).kind(), "the captured batch starts with 'begin transaction'");
            assertNotNull(cmds.get(0).oqid(), "tag 4 (origin queue id) must be parsed");
        }
    }

    @Test
    void checkpoint8_unparsableLtlDropsTheConnection() throws Exception {
        Recorder rec = new Recorder("rs_user", "rs_password");
        try (LtlServer server = start(rec); FakeRepAgent agent = new FakeRepAgent(server.localPort())) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            byte[] ok = agent.exchange(PKT_LANGUAGE, resource(DISTRIBUTE));   // a valid batch is parsed and acknowledged first
            assertTrue(contains(ok, new byte[] {(byte) 0xFD}), "a valid batch must be acknowledged before we test the bad one");
            agent.send(PKT_LANGUAGE, ascii("distribute 4 ~")); // truncated token: cannot be parsed

            assertEquals(-1, agent.readByte(), "LTL batches get no error reply, so a batch we cannot parse must close the connection");
            assertEquals(1, rec.batches.size(), "only the valid batch may reach the listener");
        }
    }

    @Test
    void checkpoint6_aClosedServerRefusesConnections() throws Exception {
        LtlServer server = start(new Recorder("rs_user", "rs_password"));
        int port = server.localPort();
        server.close();

        assertThrows(IOException.class, () -> {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress("127.0.0.1", port), 2000);
            }
        }, "after close() nothing may listen on the port any more");
    }

    // ---------------------------------------------------------------------------------------------------------
    // Helpers: not part of the exercise.

    private static LtlServer start(LtlListener listener) throws IOException {
        LtlServer server = new LtlServer("127.0.0.1", 0, listener, false, null);
        server.start();
        return server;
    }

    private static byte[] resource(String name) throws IOException {
        try (InputStream in = LtlServerTest.class.getClassLoader().getResourceAsStream(name)) {
            assertNotNull(in, "missing test resource " + name);
            return in.readAllBytes();
        }
    }

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.ISO_8859_1);
    }

    private static boolean contains(byte[] hay, byte[] needle) {
        outer:
        for (int i = 0; i + needle.length <= hay.length; i++) {
            for (int j = 0; j < needle.length; j++) if (hay[i + j] != needle[j]) continue outer;
            return true;
        }
        return false;
    }

    /** LOGINACK token: 0xAD, u16 length, then the status byte (5 = success, 6 = failure). */
    private static int loginAckStatus(byte[] reply) {
        for (int i = 0; i + 3 < reply.length; i++) if ((reply[i] & 0xff) == 0xAD) return reply[i + 3] & 0xff;
        fail("no LOGINACK token (0xAD) in the reply");
        return -1;
    }

    /** The listener the tests use: records what the session passes in, returns fixed answers. */
    private static final class Recorder implements LtlListener {
        final String okUser, okPassword;
        String loginUser, loginPassword, sourceServer, sourceDatabase;
        int proposedVersion;
        final List<List<LtlCommand>> batches = new ArrayList<>();

        Recorder(String okUser, String okPassword) {
            this.okUser = okUser;
            this.okPassword = okPassword;
        }

        @Override public boolean authenticate(String user, String password) {
            loginUser = user;
            loginPassword = password;
            return okUser.equals(user) && okPassword.equals(password);
        }
        @Override public int onConnectSource(String server, String database, int proposed) {
            sourceServer = server;
            sourceDatabase = database;
            proposedVersion = proposed;
            return proposed;
        }
        @Override public String maintenanceUser(String server, String database) { return "cdc_maint"; }
        @Override public byte[] truncationPoint(String server, String database) { return TRUNCATION; }
        @Override public void onCommands(List<LtlCommand> commands) { batches.add(commands); }
    }

    /** Plays RepAgent: sends one framed TDS message, reads the whole reply message. */
    private static final class FakeRepAgent implements AutoCloseable {
        private final Socket socket;
        private int seq = 1;

        FakeRepAgent(int port) throws IOException {
            socket = new Socket();
            socket.connect(new InetSocketAddress("127.0.0.1", port), 5000);
            socket.setSoTimeout(5000);
        }

        void send(int type, byte[] payload) throws IOException {
            int len = payload.length + 8;
            socket.getOutputStream().write(new byte[] {(byte) type, 0x01, (byte) (len >> 8), (byte) len, 0, 0, (byte) seq++, 0});
            socket.getOutputStream().write(payload);
            socket.getOutputStream().flush();
        }

        int readByte() throws IOException {
            return socket.getInputStream().read();
        }

        byte[] exchange(int type, byte[] payload) throws IOException {
            send(type, payload);
            ByteArrayOutputStream reply = new ByteArrayOutputStream();
            InputStream in = socket.getInputStream();
            while (true) {
                byte[] hdr = in.readNBytes(8);
                assertEquals(8, hdr.length, "the server closed the connection or sent a short packet header");
                int plen = ((hdr[2] & 0xff) << 8 | (hdr[3] & 0xff)) - 8;
                reply.write(in.readNBytes(plen));
                if ((hdr[1] & 0x01) != 0) return reply.toByteArray();   // last packet of the message
            }
        }

        @Override public void close() throws IOException { socket.close(); }
    }
}
