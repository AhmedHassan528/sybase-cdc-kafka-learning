package com.phoenix.cdc.sybase.connect;

import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlParser;
import org.apache.kafka.connect.source.SourceRecord;
import org.apache.kafka.connect.source.SourceTaskContext;
import org.apache.kafka.connect.storage.OffsetStorageReader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Increment 6: the Kafka Connect task (class SybaseCdcSourceTask). It ties every earlier increment together:
 * the listener, the parser, the transaction buffer, the mapper and the acknowledgement tracker.
 *
 * The tests play both sides: a fake Kafka Connect (the context and its stored offsets) and a fake RepAgent that replays
 * packets captured from a real one. Nothing here needs Docker or Kafka.
 */
@Timeout(60)
class SybaseCdcSourceTaskTest {

    private static final String LOGIN = "000001-02.bin";
    private static final String CONNECT_SOURCE = "000002-0f.bin";
    private static final String GET_TRUNCATION = "000004-01.bin";
    private static final String PAYMENT_INSERT = "ltl760/payment-insert.bin";   // begin, insert into payment, commit
    private static final int PKT_LANGUAGE = 0x01, PKT_LOGIN = 0x02, PKT_NORMAL = 0x0F;

    private SybaseCdcSourceTask task;

    @AfterEach
    void stopTask() {
        if (task != null) task.stop();
    }

    // ---------------------------------------------------------------------------------------------------------

    @Test
    void checkpoint1_startOpensTheListenerAndStopClosesIt() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", port), 2000);   // RepAgent can connect
        }
        task.stop();
        assertThrows(IOException.class, () -> {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress("127.0.0.1", port), 1000);
            }
        }, "after stop() nothing may listen on the port any more");
    }

    @Test
    void checkpoint2_theLoginIsCheckedAgainstTheConfiguredCredentials() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (FakeRepAgent agent = new FakeRepAgent(port)) {
            assertEquals(5, loginAckStatus(agent.exchange(PKT_LOGIN, resource(LOGIN))), "rs_user / rs_password is configured");
        }

        task.stop();
        port = freePort();
        Map<String, String> props = props(port, "payment");
        props.put("ltl.password", "another-secret");
        startWith(props, null);
        try (FakeRepAgent agent = new FakeRepAgent(port)) {
            assertEquals(6, loginAckStatus(agent.exchange(PKT_LOGIN, resource(LOGIN))), "the captured login sends rs_password");
        }
    }

    @Test
    void checkpoint3_aSourceForAnotherDatabaseIsRefused() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (FakeRepAgent agent = new FakeRepAgent(port)) {
            agent.exchange(PKT_LOGIN, resource(LOGIN));
            byte[] reply = agent.exchange(PKT_NORMAL, connectSource("MYSYBASE", "other_db"));
            assertTrue(contains(reply, ascii("This connector replicates phoenix_test")), "the refusal must say which database is configured");
        }
    }

    @Test
    void checkpoint4_aCommittedTransactionBecomesKafkaRecords() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (FakeRepAgent agent = connected(port)) {
            agent.exchange(PKT_LANGUAGE, resource(PAYMENT_INSERT));

            List<SourceRecord> records = task.poll();
            assertNotNull(records, "poll() must return the committed transaction");
            assertEquals(1, records.size(), "one INSERT in the captured transaction = one record");
            SourceRecord r = records.get(0);
            assertEquals("sybase.phoenix_test.payment", r.topic());
            assertEquals(Map.of("payment_id", "500000000000002"), r.key());
            @SuppressWarnings("unchecked")
            Map<String, Object> value = (Map<String, Object>) r.value();
            assertEquals("c", value.get("op"));
            @SuppressWarnings("unchecked")
            Map<String, Object> after = (Map<String, Object>) value.get("after");
            assertEquals("ACC-0002", after.get("account_no"));
        }
    }

    @Test
    void checkpoint5_theLastRecordOfATransactionCarriesItsCommitPosition() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (FakeRepAgent agent = connected(port)) {
            agent.exchange(PKT_LANGUAGE, resource(PAYMENT_INSERT));
            SourceRecord r = task.poll().get(0);

            assertEquals(Map.of("database", "phoenix_test", "server", "MYSYBASE"), r.sourcePartition(),
                "Connect stores the position under this key; it is the key the lab's _connect-offsets topic shows");
            assertEquals(Oqid.hex(commitOqid()), r.sourceOffset().get("commit_oqid"),
                "the last (here: only) record of a transaction says the whole transaction is done");
        }
    }

    @Test
    void checkpoint6_theTruncationPointOnlyAdvancesWhenKafkaConfirmsTheRecord() throws Exception {
        int port = freePort();
        start(port, "payment", null);
        try (FakeRepAgent agent = connected(port)) {
            agent.exchange(PKT_LANGUAGE, resource(PAYMENT_INSERT));
            SourceRecord r = task.poll().get(0);

            byte[] before = agent.exchange(PKT_LANGUAGE, resource(GET_TRUNCATION));
            assertTrue(contains(before, new byte[36]), "nothing confirmed yet: the position given to ASE is all zeros");
            assertFalse(contains(before, Oqid.locator(commitOqid())), "ASE must not be told the transaction is safe before Kafka confirmed it");

            task.commitRecord(r, null);   // Kafka Connect calls this when Kafka acknowledged the record

            byte[] after = agent.exchange(PKT_LANGUAGE, resource(GET_TRUNCATION));
            assertTrue(contains(after, Oqid.locator(commitOqid())), "after the confirmation the position is the commit of the transaction");
        }
    }

    @Test
    void checkpoint7_aStoredPositionIsWhereWeStartFrom() throws Exception {
        int port = freePort();
        byte[] stored = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31};
        start(port, "payment", Map.of("commit_oqid", Oqid.hex(stored)));
        try (FakeRepAgent agent = connected(port)) {
            byte[] reply = agent.exchange(PKT_LANGUAGE, resource(GET_TRUNCATION));
            assertTrue(contains(reply, Oqid.locator(stored)), "after a restart ASE is told the position Connect stored, so it sends from there");
        }
    }

    @Test
    void checkpoint8_transactionsAlreadyPublishedAreSkippedWhenRepAgentSendsThemAgain() throws Exception {
        int port = freePort();
        start(port, "payment", Map.of("commit_oqid", Oqid.hex(commitOqid())));   // we already published this transaction
        try (FakeRepAgent agent = connected(port)) {
            agent.exchange(PKT_LANGUAGE, resource(PAYMENT_INSERT));
            assertNull(task.poll(), "a transaction at or before the stored position must not be published a second time");
        }
    }

    @Test
    void checkpoint9_tablesNotOnTheIncludeListProduceNoRecordsButTheCommitStillCounts() throws Exception {
        int port = freePort();
        start(port, "some_other_table", null);
        try (FakeRepAgent agent = connected(port)) {
            agent.exchange(PKT_LANGUAGE, resource(PAYMENT_INSERT));
            assertNull(task.poll(), "payment is not on the include list: no record");

            byte[] reply = agent.exchange(PKT_LANGUAGE, resource(GET_TRUNCATION));
            assertTrue(contains(reply, Oqid.locator(commitOqid())),
                "a transaction with nothing to publish is done at once, so the position still moves on");
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // Helpers: not part of the exercise.

    private void start(int port, String includeList, Map<String, Object> storedOffset) {
        startWith(props(port, includeList), storedOffset);
    }

    private void startWith(Map<String, String> props, Map<String, Object> storedOffset) {
        task = new SybaseCdcSourceTask();
        task.initialize(new FakeContext(storedOffset));
        task.start(props);
    }

    private static Map<String, String> props(int port, String includeList) {
        Map<String, String> p = new HashMap<>();
        p.put("ltl.listen.host", "127.0.0.1");
        p.put("ltl.listen.port", String.valueOf(port));
        p.put("ltl.username", "rs_user");
        p.put("ltl.password", "rs_password");
        p.put("database.server.name", "MYSYBASE");
        p.put("database.name", "phoenix_test");
        p.put("topic.prefix", "sybase");
        p.put("table.include.list", includeList);
        return p;
    }

    private static FakeRepAgent connected(int port) throws IOException {
        FakeRepAgent agent = new FakeRepAgent(port);
        agent.exchange(PKT_LOGIN, resource(LOGIN));
        agent.exchange(PKT_NORMAL, resource(CONNECT_SOURCE));
        return agent;
    }

    private static int freePort() throws IOException {
        try (ServerSocket s = new ServerSocket(0)) {
            return s.getLocalPort();
        }
    }

    private static byte[] commitOqid() throws IOException {
        List<LtlCommand> cmds = LtlParser.parse(resource(PAYMENT_INSERT), StandardCharsets.ISO_8859_1);
        return cmds.stream().filter(c -> c.kind() == LtlCommand.Kind.COMMIT).findFirst().orElseThrow().oqid();
    }

    private static byte[] resource(String name) throws IOException {
        try (InputStream in = SybaseCdcSourceTaskTest.class.getClassLoader().getResourceAsStream(name)) {
            assertNotNull(in, "missing test resource " + name);
            return in.readAllBytes();
        }
    }

    /** A TDS 5.0 LANGUAGE token carrying "connect source lti ...": 0x21, u32 length (little-endian), status 0, text. */
    private static byte[] connectSource(String server, String database) {
        byte[] text = ascii("connect source lti \"" + server + "\".\"" + database + "\" 760 passthru");
        byte[] out = new byte[6 + text.length];
        out[0] = 0x21;
        int len = text.length + 1;
        out[1] = (byte) len;
        out[2] = (byte) (len >> 8);
        out[3] = (byte) (len >> 16);
        out[4] = (byte) (len >> 24);
        System.arraycopy(text, 0, out, 6, text.length);
        return out;
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

    private static int loginAckStatus(byte[] reply) {
        for (int i = 0; i + 3 < reply.length; i++) if ((reply[i] & 0xff) == 0xAD) return reply[i + 3] & 0xff;
        fail("no LOGINACK token (0xAD) in the reply");
        return -1;
    }

    /** The part of Kafka Connect the task talks to: stored offsets. */
    private static final class FakeContext implements SourceTaskContext {
        private final Map<String, Object> stored;

        FakeContext(Map<String, Object> stored) {
            this.stored = stored;
        }

        @Override public Map<String, String> configs() { return Map.of(); }

        @Override public OffsetStorageReader offsetStorageReader() {
            return new OffsetStorageReader() {
                @Override public <T> Map<String, Object> offset(Map<String, T> partition) { return stored; }
                @Override public <T> Map<Map<String, T>, Map<String, Object>> offsets(Collection<Map<String, T>> partitions) {
                    return partitions.stream().collect(Collectors.toMap(p -> p, p -> stored == null ? Map.<String, Object>of() : stored));
                }
            };
        }
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

        byte[] exchange(int type, byte[] payload) throws IOException {
            int len = payload.length + 8;
            socket.getOutputStream().write(new byte[] {(byte) type, 0x01, (byte) (len >> 8), (byte) len, 0, 0, (byte) seq++, 0});
            socket.getOutputStream().write(payload);
            socket.getOutputStream().flush();

            ByteArrayOutputStream reply = new ByteArrayOutputStream();
            InputStream in = socket.getInputStream();
            while (true) {
                byte[] hdr = in.readNBytes(8);
                assertEquals(8, hdr.length, "the server closed the connection or sent a short packet header");
                int plen = ((hdr[2] & 0xff) << 8 | (hdr[3] & 0xff)) - 8;
                reply.write(in.readNBytes(plen));
                if ((hdr[1] & 0x01) != 0) return reply.toByteArray();
            }
        }

        @Override public void close() throws IOException { socket.close(); }
    }
}
