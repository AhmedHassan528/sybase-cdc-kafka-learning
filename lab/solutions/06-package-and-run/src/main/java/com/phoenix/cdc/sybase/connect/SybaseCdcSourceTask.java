package com.phoenix.cdc.sybase.connect;

import com.phoenix.cdc.sybase.cdc.AckTracker;
import com.phoenix.cdc.sybase.cdc.CommittedTransaction;
import com.phoenix.cdc.sybase.cdc.Oqid;
import com.phoenix.cdc.sybase.cdc.TransactionBuffer;
import com.phoenix.cdc.sybase.ltl.LtlCommand;
import com.phoenix.cdc.sybase.ltl.LtlListener;
import com.phoenix.cdc.sybase.ltl.LtlServer;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.connect.errors.ConnectException;
import org.apache.kafka.connect.source.SourceRecord;
import org.apache.kafka.connect.source.SourceTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Runs the LTL listener and turns committed transactions into Kafka records.
 *
 * <pre>
 *  RepAgent ──LTL──▶ LtlSession thread ──▶ TransactionBuffer ──COMMIT──▶ queue ──poll()──▶ Kafka
 *      ▲                                                                                   │
 *      └────── "get truncation" ◀── AckTracker.acked() ◀── commitRecord() ◀── ack ─────────┘
 * </pre>
 *
 * Delivery: at-least-once. The ASE log is only released up to transactions
 * whose records Kafka has acknowledged; after a restart RepAgent re-sends from
 * there and transactions already published are skipped by commit OQID.
 */
public class SybaseCdcSourceTask extends SourceTask {

    private static final Logger log = LoggerFactory.getLogger(SybaseCdcSourceTask.class);
    private static final String OFFSET_OQID = "commit_oqid";

    private SybaseCdcConfig config;
    private ChangeEventMapper mapper;
    private Map<String, String> partition;
    private Set<String> includes;
    private TransactionBuffer buffer;
    private BlockingQueue<Batch> queue;
    private AckTracker acks;
    private LtlServer server;
    /** Commit OQID of the newest transaction handed to the queue; older re-sends are duplicates. */
    private volatile byte[] lastQueued;
    /** Commit OQID (hex) of the last transaction handed to Connect in poll(); poll() thread only. */
    private String publishedOqid;

    private record Batch(CommittedTransaction tx, List<LtlCommand> rows, AckTracker.Pending pending) {}

    /** A record that remembers which transaction it belongs to, for commitRecord(). */
    private static final class TrackedRecord extends SourceRecord {
        final AckTracker.Pending pending;

        TrackedRecord(Map<String, ?> partition, Map<String, ?> offset, String topic, Object key, Object value,
                      AckTracker.Pending pending) {
            super(partition, offset, topic, null, null, key, null, value);
            this.pending = pending;
        }
    }

    @Override
    public String version() {
        return SybaseCdcSourceConnector.VERSION;
    }

    @Override
    public void start(Map<String, String> props) {
        config = new SybaseCdcConfig(props);
        partition = config.sourcePartition();
        includes = config.tableIncludes();
        mapper = new ChangeEventMapper(config.serverName(), config.databaseName(), config.topicPrefix());
        buffer = new TransactionBuffer(config.largeTransactionRows());
        queue = new ArrayBlockingQueue<>(config.queueMaxTransactions());

        Map<String, Object> offset = context.offsetStorageReader().offset(partition);
        byte[] stored = offset == null ? null : Oqid.fromHex((String) offset.get(OFFSET_OQID));
        acks = new AckTracker(stored);
        lastQueued = stored;
        publishedOqid = Oqid.hex(stored);
        log.info("Starting Sybase CDC task for {}.{}; last committed OQID in Kafka: {}",
            config.serverName(), config.databaseName(), stored == null ? "none (first start)" : Oqid.hex(stored));

        Charset cs = config.charset().isBlank() ? null : Charset.forName(config.charset());
        server = new LtlServer(config.listenHost(), config.listenPort(), new Listener(), config.trace(), cs);
        try {
            server.start();
        } catch (IOException e) {
            throw new ConnectException("Cannot listen on " + config.listenHost() + ":" + config.listenPort(), e);
        }
    }

    @Override
    public List<SourceRecord> poll() throws InterruptedException {
        Batch first = queue.poll(1, TimeUnit.SECONDS);
        if (first == null) return null;
        List<SourceRecord> out = new ArrayList<>();
        Batch b = first;
        while (b != null) {
            // Connect stores the offset of the newest acknowledged record. Only the last record of a
            // transaction may claim the transaction is done; the others keep the previous safe position,
            // so a crash after a partial publish re-sends the whole transaction instead of losing rows.
            String commit = Oqid.hex(b.tx().commitOqid());
            Map<String, String> partialOffset = Map.of(OFFSET_OQID, publishedOqid == null ? "" : publishedOqid);
            Map<String, String> doneOffset = Map.of(OFFSET_OQID, commit);
            int n = b.rows().size();
            for (int seq = 0; seq < n; seq++) {
                LtlCommand c = b.rows().get(seq);
                out.add(new TrackedRecord(partition, seq == n - 1 ? doneOffset : partialOffset, mapper.topic(c),
                    mapper.key(c), mapper.value(c, b.tx(), seq), b.pending()));
            }
            publishedOqid = commit;
            if (out.size() >= config.pollMaxRecords()) break;
            b = queue.poll();
        }
        return out;
    }

    /** Called by the Connect framework once Kafka acknowledged the record. */
    @Override
    public void commitRecord(SourceRecord record, RecordMetadata metadata) {
        if (record instanceof TrackedRecord t) acks.ack(t.pending);
    }

    @Override
    public void stop() {
        if (server != null) server.close();
    }

    private final class Listener implements LtlListener {

        @Override
        public boolean authenticate(String user, String password) {
            return config.ltlUser().equals(user) && config.ltlPassword().value().equals(password);
        }

        @Override
        public int onConnectSource(String srv, String db, int proposedVersion) {
            if (!db.equalsIgnoreCase(config.databaseName())) {
                throw new IllegalArgumentException("This connector replicates " + config.databaseName() + ", not " + db);
            }
            if (!srv.equalsIgnoreCase(config.serverName())) {
                log.warn("RepAgent reports server {} but {} = {}", srv, SybaseCdcConfig.DB_SERVER, config.serverName());
            }
            if (proposedVersion < 760) {
                throw new IllegalArgumentException("LTL " + proposedVersion + " not supported (need 760+, ASE 16)");
            }
            buffer.clear();   // RepAgent re-sends from the truncation point after every (re)connect
            return 760;
        }

        @Override
        public String maintenanceUser(String srv, String db) {
            return config.maintenanceUser();
        }

        @Override
        public byte[] truncationPoint(String srv, String db) {
            return Oqid.locator(acks.acked());
        }

        @Override
        public void onCommands(List<LtlCommand> commands) throws InterruptedException {
            for (LtlCommand c : commands) {
                CommittedTransaction tx = buffer.accept(c).orElse(null);
                if (tx == null) continue;
                if (lastQueued != null && Oqid.compare(tx.commitOqid(), lastQueued) <= 0) {
                    log.debug("Skipping re-sent transaction {} (already published)", tx.tranId());
                    continue;
                }
                List<LtlCommand> rows = includes.isEmpty() ? tx.changes()
                    : tx.changes().stream().filter(r -> includes.contains(r.table().toLowerCase())).toList();
                // Register in commit order; transactions without rows still move the watermark.
                AckTracker.Pending pending = acks.register(tx.commitOqid(), rows.size());
                lastQueued = tx.commitOqid();
                if (!rows.isEmpty()) queue.put(new Batch(tx, rows, pending));   // blocks when Kafka lags
            }
        }

        @Override
        public void onDisconnect(String srv, String db, Exception cause) {
            buffer.clear();
            log.info("RepAgent for {}.{} disconnected{}", srv, db, cause == null ? "" : ": " + cause.getMessage());
        }
    }
}
