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
        // TODO 1 (checkpoints 1, 2, 7): start the task. In this order:
        //   - config = new SybaseCdcConfig(props); partition = config.sourcePartition(); includes = config.tableIncludes();
        //   - mapper = new ChangeEventMapper(serverName, databaseName, topicPrefix);
        //   - buffer = new TransactionBuffer(config.largeTransactionRows());
        //   - queue = new ArrayBlockingQueue<>(config.queueMaxTransactions());   // back-pressure towards RepAgent
        //   - read the stored position: context.offsetStorageReader().offset(partition) is a map with "commit_oqid" (hex) or null;
        //     convert with Oqid.fromHex. Then acks = new AckTracker(stored); lastQueued = stored; publishedOqid = Oqid.hex(stored);
        //     and log "last committed OQID in Kafka: ..." (or "none (first start)") - the lab's log line you saw in Section 7.
        //   - create the LtlServer (host, port, new Listener(), config.trace(), the charset or null) and start it; an IOException
        //     becomes a ConnectException("Cannot listen on host:port", e).
        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.start()");
    }

    @Override
    public List<SourceRecord> poll() throws InterruptedException {
        // TODO 2 (checkpoints 4, 5, 8, 9): turn queued transactions into records.
        //   - wait up to 1 second for the first Batch (queue.poll(1, TimeUnit.SECONDS)); none: return null.
        //   - for every batch (keep taking with queue.poll() until empty or config.pollMaxRecords() records are collected):
        //       the partial offset is Map.of("commit_oqid", publishedOqid == null ? "" : publishedOqid);
        //       the done offset is Map.of("commit_oqid", <hex of the batch's commit oqid>);
        //       for each row i of the batch add new TrackedRecord(partition, <done offset for the LAST row, partial for the others>,
        //       mapper.topic(c), mapper.key(c), mapper.value(c, tx, i), pending);
        //       afterwards publishedOqid = the commit hex.
        //     Only the last record may say "transaction done": if Connect crashed between two records of one transaction, the
        //     stored position must still be the one before it, so the whole transaction is sent again.
        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.poll()");
    }

    /** Called by the Connect framework once Kafka acknowledged the record. */
    @Override
    public void commitRecord(SourceRecord record, RecordMetadata metadata) {
        // TODO 3 (checkpoint 6): Kafka Connect calls this when Kafka acknowledged one record. If it is a TrackedRecord, tell the
        //   AckTracker: acks.ack(t.pending).
        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.commitRecord()");
    }

    @Override
    public void stop() {
        // TODO 4 (checkpoint 1): close the LtlServer if it was started.
        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.stop()");
    }

    private final class Listener implements LtlListener {

        @Override
        public boolean authenticate(String user, String password) {
        // TODO 5 (checkpoint 2): true when user and password equal the configured ltl.username / ltl.password.
        throw new UnsupportedOperationException("increment 6: Listener.authenticate()");
        }

        @Override
        public int onConnectSource(String srv, String db, int proposedVersion) {
        // TODO 6 (checkpoint 3): refuse (throw IllegalArgumentException) a database other than the configured one (ignore case)
        //   with the message "This connector replicates <db>, not <other>"; warn when the server name differs; refuse an
        //   LTL version below 760; clear the transaction buffer (RepAgent re-sends from the truncation point after every
        //   connect); return 760.
        throw new UnsupportedOperationException("increment 6: Listener.onConnectSource()");
        }

        @Override
        public String maintenanceUser(String srv, String db) {
        // TODO 7: the configured maintenance user.
        throw new UnsupportedOperationException("increment 6: Listener.maintenanceUser()");
        }

        @Override
        public byte[] truncationPoint(String srv, String db) {
        // TODO 8 (checkpoints 6, 7, 9): the position we tell ASE it may free its log up to: Oqid.locator(acks.acked()).
        throw new UnsupportedOperationException("increment 6: Listener.truncationPoint()");
        }

        @Override
        public void onCommands(List<LtlCommand> commands) throws InterruptedException {
        // TODO 9 (checkpoints 4, 8, 9): for each command, buffer.accept(c); when it returns a finished transaction tx:
        //   - if lastQueued is not null and the commit oqid is not newer than it (Oqid.compare(...) <= 0), it was published before:
        //     skip it (log at debug level);
        //   - rows = all of tx.changes(), or only those whose table (lower case) is in `includes` when `includes` is not empty;
        //   - pending = acks.register(tx.commitOqid(), rows.size())   // ALWAYS, even with 0 rows: the position must still move;
        //   - lastQueued = tx.commitOqid();
        //   - if there are rows: queue.put(new Batch(tx, rows, pending))   // blocks when Kafka lags: back-pressure on RepAgent.
        throw new UnsupportedOperationException("increment 6: Listener.onCommands()");
        }

        @Override
        public void onDisconnect(String srv, String db, Exception cause) {
        // TODO 10: RepAgent will send everything after the truncation point again after reconnecting: clear the transaction
        //   buffer and log the disconnect (with the cause when there is one).
        throw new UnsupportedOperationException("increment 6: Listener.onDisconnect()");
        }
    }
}
