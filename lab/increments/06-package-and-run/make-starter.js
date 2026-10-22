// Generates starter/ from ../../solutions/06-package-and-run: the same files, with the code the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '06-package-and-run');
const OUT = path.join(__dirname, 'starter');

function cpdir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === 'target') continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) cpdir(a, b); else fs.copyFileSync(a, b);
  }
}
fs.rmSync(OUT, { recursive: true, force: true });
cpdir(SOL, OUT);

function stub(file, sig, body) {
  const p = path.join(OUT, file);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const i = lines.findIndex(l => l.includes(sig));
  if (i < 0) throw new Error('signature not found: ' + sig);
  let depth = 0, j = i, opened = false;
  for (; j < lines.length; j++) {
    for (const ch of lines[j]) { if (ch === '{') { depth++; opened = true; } else if (ch === '}') depth--; }
    if (opened && depth === 0) break;
  }
  lines.splice(i + 1, j - i - 1, ...body);
  fs.writeFileSync(p, lines.join('\n'));
}
const F = 'src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcSourceTask.java';
stub(F, 'public void start(Map<String, String> props) {', [
  '        // TODO 1 (checkpoints 1, 2, 7): start the task. In this order:',
  '        //   - config = new SybaseCdcConfig(props); partition = config.sourcePartition(); includes = config.tableIncludes();',
  '        //   - mapper = new ChangeEventMapper(serverName, databaseName, topicPrefix);',
  '        //   - buffer = new TransactionBuffer(config.largeTransactionRows());',
  '        //   - queue = new ArrayBlockingQueue<>(config.queueMaxTransactions());   // back-pressure towards RepAgent',
  '        //   - read the stored position: context.offsetStorageReader().offset(partition) is a map with "commit_oqid" (hex) or null;',
  '        //     convert with Oqid.fromHex. Then acks = new AckTracker(stored); lastQueued = stored; publishedOqid = Oqid.hex(stored);',
  '        //     and log "last committed OQID in Kafka: ..." (or "none (first start)") - the lab\'s log line you saw in Section 7.',
  '        //   - create the LtlServer (host, port, new Listener(), config.trace(), the charset or null) and start it; an IOException',
  '        //     becomes a ConnectException("Cannot listen on host:port", e).',
  '        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.start()");']);
stub(F, 'public List<SourceRecord> poll() throws InterruptedException {', [
  '        // TODO 2 (checkpoints 4, 5, 8, 9): turn queued transactions into records.',
  '        //   - wait up to 1 second for the first Batch (queue.poll(1, TimeUnit.SECONDS)); none: return null.',
  '        //   - for every batch (keep taking with queue.poll() until empty or config.pollMaxRecords() records are collected):',
  '        //       the partial offset is Map.of("commit_oqid", publishedOqid == null ? "" : publishedOqid);',
  '        //       the done offset is Map.of("commit_oqid", <hex of the batch\'s commit oqid>);',
  '        //       for each row i of the batch add new TrackedRecord(partition, <done offset for the LAST row, partial for the others>,',
  '        //       mapper.topic(c), mapper.key(c), mapper.value(c, tx, i), pending);',
  '        //       afterwards publishedOqid = the commit hex.',
  '        //     Only the last record may say "transaction done": if Connect crashed between two records of one transaction, the',
  '        //     stored position must still be the one before it, so the whole transaction is sent again.',
  '        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.poll()");']);
stub(F, 'public void commitRecord(SourceRecord record, RecordMetadata metadata) {', [
  '        // TODO 3 (checkpoint 6): Kafka Connect calls this when Kafka acknowledged one record. If it is a TrackedRecord, tell the',
  '        //   AckTracker: acks.ack(t.pending).',
  '        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.commitRecord()");']);
stub(F, 'public void stop() {', [
  '        // TODO 4 (checkpoint 1): close the LtlServer if it was started.',
  '        throw new UnsupportedOperationException("increment 6: SybaseCdcSourceTask.stop()");']);
stub(F, 'public boolean authenticate(String user, String password) {', [
  '        // TODO 5 (checkpoint 2): true when user and password equal the configured ltl.username / ltl.password.',
  '        throw new UnsupportedOperationException("increment 6: Listener.authenticate()");']);
stub(F, 'public int onConnectSource(String srv, String db, int proposedVersion) {', [
  '        // TODO 6 (checkpoint 3): refuse (throw IllegalArgumentException) a database other than the configured one (ignore case)',
  '        //   with the message "This connector replicates <db>, not <other>"; warn when the server name differs; refuse an',
  '        //   LTL version below 760; clear the transaction buffer (RepAgent re-sends from the truncation point after every',
  '        //   connect); return 760.',
  '        throw new UnsupportedOperationException("increment 6: Listener.onConnectSource()");']);
stub(F, 'public String maintenanceUser(String srv, String db) {', [
  '        // TODO 7: the configured maintenance user.',
  '        throw new UnsupportedOperationException("increment 6: Listener.maintenanceUser()");']);
stub(F, 'public byte[] truncationPoint(String srv, String db) {', [
  '        // TODO 8 (checkpoints 6, 7, 9): the position we tell ASE it may free its log up to: Oqid.locator(acks.acked()).',
  '        throw new UnsupportedOperationException("increment 6: Listener.truncationPoint()");']);
stub(F, 'public void onCommands(List<LtlCommand> commands) throws InterruptedException {', [
  '        // TODO 9 (checkpoints 4, 8, 9): for each command, buffer.accept(c); when it returns a finished transaction tx:',
  '        //   - if lastQueued is not null and the commit oqid is not newer than it (Oqid.compare(...) <= 0), it was published before:',
  '        //     skip it (log at debug level);',
  '        //   - rows = all of tx.changes(), or only those whose table (lower case) is in `includes` when `includes` is not empty;',
  '        //   - pending = acks.register(tx.commitOqid(), rows.size())   // ALWAYS, even with 0 rows: the position must still move;',
  '        //   - lastQueued = tx.commitOqid();',
  '        //   - if there are rows: queue.put(new Batch(tx, rows, pending))   // blocks when Kafka lags: back-pressure on RepAgent.',
  '        throw new UnsupportedOperationException("increment 6: Listener.onCommands()");']);
stub(F, 'public void onDisconnect(String srv, String db, Exception cause) {', [
  '        // TODO 10: RepAgent will send everything after the truncation point again after reconnecting: clear the transaction',
  '        //   buffer and log the disconnect (with the cause when there is one).',
  '        throw new UnsupportedOperationException("increment 6: Listener.onDisconnect()");']);

let pom = fs.readFileSync(path.join(OUT, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 6. The tests are shared with the starter (lab/increments/06-package-and-run/tests).',
                  'Starter of increment 6: your working copy. The tests are in lab/increments/06-package-and-run/tests.')
         .split('../../increments/06-package-and-run/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
