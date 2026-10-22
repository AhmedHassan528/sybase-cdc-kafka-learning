// Diagram specs compiled by drawio-gen.js. Coordinates are in pixels on draw.io's canvas.
// Kinds: step (our code), data (stores/outputs), ext (vendor/external), decision (decision/note),
// error (failure path), security (secrets/auth), term (start/end).

const L = (items, x, y, w) => ({ x, y, w: w || 270, items });
const lgStep = { kind: 'step', text: 'Connector code (this project)' };
const lgExt = { kind: 'ext', text: 'Vendor / platform component' };
const lgData = { kind: 'data', text: 'Data store or output' };
const lgErr = { kind: 'error', text: 'Failure or error path' };
const lgDec = { kind: 'decision', text: 'Decision or note' };
const lgSec = { kind: 'security', text: 'Credentials / security' };
const lnData = { line: true, text: 'Data flow' };
const lnAck = { line: true, dashed: true, color: '#9a6100', text: 'Acknowledgement / control' };

module.exports = [

// 1 ─ Overall system architecture
{
  id: '01-system-architecture', name: 'System architecture',
  title: 'Sybase ASE → Kafka CDC: system architecture (verified local build)',
  subtitle: 'RepAgent (inside ASE) pushes the transaction log as LTL to the connector, which impersonates a Replication Server. No triggers, no polling, no Replication Server product.',
  titleWidth: 1180,
  groups: [
    { id: 'gase', label: 'SAP ASE 16.0 server (container cdc-sybase)', x: 20, y: 80, w: 300, h: 430, fill: '#ffe6cc', stroke: '#d79b00' },
    { id: 'gcon', label: 'Kafka Connect worker (container cdc-connect)', x: 380, y: 80, w: 520, h: 430, fill: '#dae8fc', stroke: '#6c8ebf' },
    { id: 'gk', label: 'Kafka broker (cdc-kafka, KRaft)', x: 960, y: 80, w: 240, h: 430, fill: '#d5e8d4', stroke: '#82b366' },
  ],
  nodes: [
    { id: 'app', parent: 'gase', label: 'Phoenix application|INSERT / UPDATE / DELETE', x: 70, y: 40, w: 170, kind: 'ext' },
    { id: 'log', parent: 'gase', label: 'phoenix_test log|syslogs, 512 MB device', x: 80, y: 150, w: 150, shape: 'db', kind: 'data' },
    { id: 'ra', parent: 'gase', label: 'RepAgent thread|sp_config_rep_agent', x: 70, y: 270, w: 170, kind: 'ext' },
    { id: 'stp', parent: 'gase', label: 'secondary truncation point|syslogshold', x: 70, y: 360, w: 170, h: 50, kind: 'decision' },
    { id: 'srv', parent: 'gcon', label: 'LtlServer + LtlSession|TDS listener :11752', x: 20, y: 270, w: 200 },
    { id: 'par', parent: 'gcon', label: 'LtlParser + LtlValues|LTL 760 decoder', x: 20, y: 150, w: 200 },
    { id: 'buf', parent: 'gcon', label: 'TransactionBuffer|rows held per tran_id', x: 20, y: 40, w: 200 },
    { id: 'tsk', parent: 'gcon', label: 'SybaseCdcSourceTask|queue → poll()', x: 290, y: 40, w: 200 },
    { id: 'mapper', parent: 'gcon', label: 'ChangeEventMapper|key + JSON value', x: 290, y: 150, w: 200 },
    { id: 'ack', parent: 'gcon', label: 'AckTracker|acked commit OQID', x: 290, y: 270, w: 200, kind: 'decision' },
    { id: 'off', parent: 'gcon', label: 'Connect offsets|_connect-offsets', x: 300, y: 360, w: 180, h: 50, kind: 'data' },
    { id: 'ctopics', parent: 'gk', label: '_connect-configs|_connect-offsets|_connect-status', x: 30, y: 40, w: 180, h: 70, kind: 'data' },
    { id: 'topic', parent: 'gk', label: 'sybase.phoenix_test.payment|1 partition', x: 30, y: 140, w: 180, shape: 'db', kind: 'data', h: 80 },
    { id: 'cons', label: 'Consumers|dedupe on source.oqid', x: 1000, y: 550, w: 170, kind: 'ext' },
    { id: 'ui', label: 'kafka-ui :8080|inspection only', x: 1000, y: 640, w: 170, kind: 'term' },
  ],
  edges: [
    { from: 'app', to: 'log', label: 'writes', parent: 'gase' },
    { from: 'log', to: 'ra', label: 'scan', parent: 'gase' },
    { from: 'ra', to: 'srv', label: 'TDS + LTL push' },
    { from: 'srv', to: 'par', parent: 'gcon' },
    { from: 'par', to: 'buf', parent: 'gcon' },
    { from: 'buf', to: 'tsk', label: 'COMMIT', parent: 'gcon' },
    { from: 'tsk', to: 'mapper', parent: 'gcon' },
    { from: 'mapper', to: 'topic', label: 'produce', exit: [1, 0.5], entry: [0, 0.45] },
    { from: 'topic', to: 'ack', label: 'producer ack', dashed: true, color: '#9a6100', exit: [0, 0.85], entry: [1, 0.5] },
    { from: 'ack', to: 'srv', label: 'truncation', dashed: true, color: '#9a6100', parent: 'gcon' },
    { from: 'ra', to: 'stp', label: 'moves', dashed: true, color: '#9a6100', parent: 'gase' },
    { from: 'ack', to: 'off', dashed: true, color: '#9a6100', parent: 'gcon' },
    { from: 'topic', to: 'cons', label: 'consume' },
  ],
  legend: L([lgStep, lgExt, lgData, lgDec, lnData, lnAck], 20, 540, 300),
},

// 2 ─ End-to-end CDC data flow (numbered steps)
{
  id: '02-cdc-data-flow', name: 'CDC data flow',
  title: 'End-to-end CDC data flow: one committed row change',
  subtitle: 'Read the numbers in order. Steps 1–4 happen inside ASE, 5–9 in the connector, 10–12 in Kafka. Nothing is published before step 7 (COMMIT).',
  titleWidth: 1100,
  nodes: [
    { id: 's1', label: '1. Application commits|insert payment ...', x: 20, y: 90, w: 190, kind: 'ext' },
    { id: 's2', label: '2. ASE writes log records|begin, insert, commit', x: 250, y: 90, w: 190, kind: 'ext' },
    { id: 's3', label: '3. RepAgent scans log|marked tables only', x: 480, y: 90, w: 190, kind: 'ext' },
    { id: 's4', label: '4. RepAgent sends LTL|distribute ... over TDS', x: 710, y: 90, w: 190, kind: 'ext' },
    { id: 's5', label: '5. LtlSession receives|one DONE per message', x: 710, y: 210, w: 190 },
    { id: 's6', label: '6. LtlParser decodes|LtlCommand objects', x: 480, y: 210, w: 190 },
    { id: 's7', label: '7. TransactionBuffer|release on COMMIT', x: 250, y: 210, w: 190 },
    { id: 's8', label: '8. Queue + poll()|bounded = back-pressure', x: 20, y: 210, w: 190 },
    { id: 's9', label: '9. SourceRecord|topic, key, value, offset', x: 20, y: 330, w: 190 },
    { id: 's10', label: '10. Producer writes|JsonConverter', x: 250, y: 330, w: 190, kind: 'data' },
    { id: 's11', label: '11. Broker acks|commitRecord()', x: 480, y: 330, w: 190, kind: 'data' },
    { id: 's12', label: '12. Next get truncation|log space released', x: 710, y: 330, w: 190, kind: 'decision' },
    { id: 'rb', label: 'ROLLBACK|rows discarded, nothing published', x: 250, y: 450, w: 190, kind: 'error' },
  ],
  edges: [
    { from: 's1', to: 's2' }, { from: 's2', to: 's3' }, { from: 's3', to: 's4' }, { from: 's4', to: 's5' },
    { from: 's5', to: 's6' }, { from: 's6', to: 's7' }, { from: 's7', to: 's8' },
    { from: 's8', to: 's9' }, { from: 's9', to: 's10' }, { from: 's10', to: 's11' },
    { from: 's11', to: 's12', dashed: true, color: '#9a6100' },
    { from: 's7', to: 'rb', color: '#b85450', exit: [1, 0.85], entry: [1, 0.5] },
  ],
  legend: L([lgExt, lgStep, lgData, lgErr, lnAck], 480, 440, 300),
},

// 3 ─ Sybase transaction and RepAgent flow (log records → LTL)
{
  id: '03-repagent-transaction-flow', name: 'Transaction and RepAgent flow',
  title: 'How one ASE transaction becomes LTL commands',
  subtitle: 'Left: what ASE writes to the transaction log. Middle: the LTL 760 command RepAgent sends for each record. Right: what the connector does with it.',
  titleWidth: 1100,
  groups: [
    { id: 'g1', label: 'ASE transaction log (syslogs)', x: 20, y: 80, w: 300, h: 380, fill: '#ffe6cc', stroke: '#d79b00' },
    { id: 'g2', label: 'LTL 760 sent by RepAgent', x: 360, y: 80, w: 400, h: 380, fill: '#f5f5f5' },
    { id: 'g3', label: 'Connector action', x: 800, y: 80, w: 300, h: 380, fill: '#dae8fc', stroke: '#6c8ebf' },
  ],
  nodes: [
    { id: 'l1', parent: 'g1', label: 'BEGINXACT|xid 0x...1c6d001a', x: 20, y: 40, w: 260, h: 50, kind: 'plain' },
    { id: 'l2', parent: 'g1', label: 'INSERT row|payment (marked with sp_setreptable)', x: 20, y: 120, w: 260, h: 50, kind: 'plain' },
    { id: 'l3', parent: 'g1', label: 'UPDATE row|before + after images', x: 20, y: 200, w: 260, h: 50, kind: 'plain' },
    { id: 'l4', parent: 'g1', label: 'ENDXACT (commit)', x: 20, y: 280, w: 260, h: 50, kind: 'plain' },
    { id: 'c1', parent: 'g2', label: 'distribute 1 time,4 oqid,6 xid|begin transaction ~"%_ins npw ~"#sa', x: 20, y: 40, w: 360, h: 50, kind: 'ext' },
    { id: 'c2', parent: 'g2', label: 'distribute 4 oqid,6 xid applied|~"(payment.~!*rs_insert yielding after ...', x: 20, y: 120, w: 360, h: 50, kind: 'ext' },
    { id: 'c3', parent: 'g2', label: 'distribute ... rs_update yielding|before (all cols) after (changed cols)', x: 20, y: 200, w: 360, h: 50, kind: 'ext' },
    { id: 'c4', parent: 'g2', label: 'distribute 1 time,4 oqid,6 xid|commit transaction', x: 20, y: 280, w: 360, h: 50, kind: 'ext' },
    { id: 'a1', parent: 'g3', label: 'open buffer for xid|remember user', x: 20, y: 40, w: 260, h: 50 },
    { id: 'a2', parent: 'g3', label: 'append INSERT (after image)', x: 20, y: 120, w: 260, h: 50 },
    { id: 'a3', parent: 'g3', label: 'append UPDATE|after = before + changes', x: 20, y: 200, w: 260, h: 50 },
    { id: 'a4', parent: 'g3', label: 'publish all rows|commit OQID = new position', x: 20, y: 280, w: 260, h: 50, kind: 'data' },
  ],
  edges: [
    { from: 'l1', to: 'c1' }, { from: 'l2', to: 'c2' }, { from: 'l3', to: 'c3' }, { from: 'l4', to: 'c4' },
    { from: 'c1', to: 'a1' }, { from: 'c2', to: 'a2' }, { from: 'c3', to: 'a3' }, { from: 'c4', to: 'a4' },
  ],
  legend: L([{ kind: 'plain', text: 'Log record (inside ASE)' }, lgExt, lgStep, lgData], 20, 490, 300),
},

// 4 ─ Replication architecture: classic SAP vs this project
{
  id: '04-replication-architecture', name: 'Replication architecture',
  title: 'Replication architecture: classic SAP Replication Server vs. this project',
  subtitle: 'RepAgent only knows how to talk to "a Replication Server". The connector answers the same protocol, so RepAgent needs no change; SAP Replication Server is not installed.',
  titleWidth: 1100,
  groups: [
    { id: 'ga', label: 'A. Classic SAP topology (not used here)', x: 20, y: 80, w: 1060, h: 150, fill: '#f5f5f5' },
    { id: 'gb', label: 'B. This project', x: 20, y: 260, w: 1060, h: 150, fill: '#dae8fc', stroke: '#6c8ebf' },
  ],
  nodes: [
    { id: 'a1', parent: 'ga', label: 'Primary ASE|RepAgent', x: 20, y: 50, w: 170, kind: 'ext' },
    { id: 'a2', parent: 'ga', label: 'SAP Replication Server|stable queues, repdefs, subscriptions', x: 280, y: 50, w: 260, kind: 'ext' },
    { id: 'a3', parent: 'ga', label: 'Replicate ASE / other DB|DSI applies SQL', x: 640, y: 50, w: 220, kind: 'ext' },
    { id: 'b1', parent: 'gb', label: 'Primary ASE|RepAgent (unchanged)', x: 20, y: 50, w: 170, kind: 'ext' },
    { id: 'b2', parent: 'gb', label: 'Custom Kafka Connect source|emulates RS: login, connect source, get truncation', x: 280, y: 50, w: 260 },
    { id: 'b3', parent: 'gb', label: 'Kafka topic|JSON change events', x: 640, y: 50, w: 220, kind: 'data' },
    { id: 'n', label: 'Same idea in a commercial product: Qlik Replicate "RepAgent CDC" (Preview) also points RepAgent at its own listener.', x: 20, y: 430, w: 660, h: 46, shape: 'note' },
  ],
  edges: [
    { from: 'a1', to: 'a2', label: 'LTL', parent: 'ga' }, { from: 'a2', to: 'a3', label: 'SQL', parent: 'ga' },
    { from: 'b1', to: 'b2', label: 'LTL 760', parent: 'gb' }, { from: 'b2', to: 'b3', label: 'produce', parent: 'gb' },
  ],
  legend: L([lgExt, lgStep, lgData], 720, 430, 300),
},

// 5 ─ Kafka Connect source connector lifecycle
{
  id: '05-connector-lifecycle', name: 'Connector lifecycle',
  title: 'Kafka Connect lifecycle of SybaseCdcSourceConnector / SybaseCdcSourceTask',
  subtitle: 'Who calls what, in which order. Methods in blue are ours; Connect framework actions are orange.',
  titleWidth: 1100,
  nodes: [
    { id: 'w1', label: 'Worker starts|scans plugin.path', x: 20, y: 90, w: 180, kind: 'ext' },
    { id: 'w2', label: 'POST /connectors|config JSON', x: 240, y: 90, w: 180, kind: 'ext' },
    { id: 'c1', label: 'Connector.start(props)|validate config', x: 460, y: 90, w: 190 },
    { id: 'c2', label: 'taskConfigs(maxTasks)|always 1 task', x: 690, y: 90, w: 190 },
    { id: 't1', label: 'Task.start(props)|read stored offset', x: 690, y: 210, w: 190 },
    { id: 't2', label: 'LtlServer.start()|listen :11752', x: 460, y: 210, w: 190 },
    { id: 't3', label: 'poll() loop|1 s wait on queue', x: 240, y: 210, w: 180 },
    { id: 't4', label: 'commitRecord()|after broker ack', x: 20, y: 210, w: 180 },
    { id: 'o1', label: 'Offset flush|every 5 s (worker)', x: 20, y: 330, w: 180, kind: 'ext' },
    { id: 'p1', label: 'PUT /pause|task keeps running', x: 240, y: 330, w: 180, kind: 'decision' },
    { id: 's1', label: 'PUT /stop or delete|Task.stop(): close server', x: 460, y: 330, w: 190, kind: 'decision' },
    { id: 'r1', label: 'Rebalance / crash|new Task.start()', x: 690, y: 330, w: 190, kind: 'error' },
  ],
  edges: [
    { from: 'w1', to: 'w2' }, { from: 'w2', to: 'c1' }, { from: 'c1', to: 'c2' }, { from: 'c2', to: 't1' },
    { from: 't1', to: 't2' }, { from: 't2', to: 't3' }, { from: 't3', to: 't4' },
    { from: 't4', to: 'o1', dashed: true, color: '#9a6100' },
    { from: 'r1', to: 't1', label: 'restart', color: '#b85450' },
  ],
  legend: L([lgExt, lgStep, lgDec, lgErr], 20, 440, 300),
},

// 6 ─ Java class relationships
{
  id: '06-class-relationships', name: 'Java classes',
  title: 'Java classes and their relationships (package com.phoenix.cdc.sybase)',
  subtitle: 'Arrows inside a package: uses / creates. Arrows between packages summarise all dependencies in that direction. No cycles between packages.',
  titleWidth: 1200,
  groups: [
    { id: 'pconnect', label: 'connect (Kafka Connect API)', x: 20, y: 80, w: 560, h: 220, fill: '#dae8fc', stroke: '#6c8ebf' },
    { id: 'pcdc', label: 'cdc (transaction logic)', x: 620, y: 80, w: 560, h: 220, fill: '#d5e8d4', stroke: '#82b366' },
    { id: 'pltl', label: 'ltl (LTL protocol)', x: 20, y: 330, w: 760, h: 220, fill: '#fff2cc', stroke: '#d6b656' },
    { id: 'ptds', label: 'tds (TDS 5.0 wire)', x: 820, y: 330, w: 360, h: 220, fill: '#ffe6cc', stroke: '#d79b00' },
  ],
  nodes: [
    { id: 'conn', parent: 'pconnect', label: 'SybaseCdcSourceConnector|extends SourceConnector', x: 20, y: 40, w: 210 },
    { id: 'task', parent: 'pconnect', label: 'SybaseCdcSourceTask|extends SourceTask|inner Listener implements LtlListener', x: 320, y: 40, w: 220, h: 70 },
    { id: 'cfg', parent: 'pconnect', label: 'SybaseCdcConfig|extends AbstractConfig', x: 20, y: 140, w: 210 },
    { id: 'mapper', parent: 'pconnect', label: 'ChangeEventMapper|topic, key, value', x: 320, y: 140, w: 220 },
    { id: 'buf', parent: 'pcdc', label: 'TransactionBuffer|per tran_id', x: 20, y: 40, w: 160 },
    { id: 'ctx', parent: 'pcdc', label: 'CommittedTransaction|record', x: 220, y: 40, w: 160 },
    { id: 'ackt', parent: 'pcdc', label: 'AckTracker|watermark', x: 20, y: 140, w: 160 },
    { id: 'oq', parent: 'pcdc', label: 'Oqid|static helpers', x: 220, y: 140, w: 160 },
    { id: 'srv', parent: 'pltl', label: 'LtlServer|accept loop', x: 20, y: 40, w: 150 },
    { id: 'ses', parent: 'pltl', label: 'LtlSession|one per RepAgent', x: 210, y: 40, w: 150 },
    { id: 'lst', parent: 'pltl', label: 'LtlListener|interface', x: 400, y: 40, w: 150, kind: 'decision' },
    { id: 'cmd', parent: 'pltl', label: 'LtlCommand|record, built by LtlParser', x: 590, y: 40, w: 150 },
    { id: 'lex', parent: 'pltl', label: 'LtlLexer|bytes → tokens', x: 20, y: 140, w: 150 },
    { id: 'par', parent: 'pltl', label: 'LtlParser|tokens → commands', x: 210, y: 140, w: 150 },
    { id: 'val', parent: 'pltl', label: 'LtlValues|token → Java value', x: 400, y: 140, w: 150 },
    { id: 'ch', parent: 'ptds', label: 'TdsChannel|packets', x: 20, y: 40, w: 150 },
    { id: 'tlogin', parent: 'ptds', label: 'TdsLogin|login record', x: 190, y: 40, w: 150 },
    { id: 'tk', parent: 'ptds', label: 'TdsTokens|response tokens', x: 105, y: 140, w: 150 },
    { id: 'probe', label: 'tools.LtlProbe|discovery main()', x: 20, y: 590, w: 200, kind: 'term' },
  ],
  edges: [
    { from: 'conn', to: 'task', label: 'taskClass()', parent: 'pconnect' },
    { from: 'conn', to: 'cfg', parent: 'pconnect' },
    { from: 'task', to: 'mapper', parent: 'pconnect' },
    { from: 'buf', to: 'ctx', parent: 'pcdc' },
    { from: 'srv', to: 'ses', parent: 'pltl' },
    { from: 'ses', to: 'lst', label: 'calls', parent: 'pltl' },
    { from: 'ses', to: 'par', parent: 'pltl' },
    { from: 'par', to: 'lex', parent: 'pltl' },
    { from: 'par', to: 'val', parent: 'pltl' },
    { from: 'pconnect', to: 'pcdc', label: 'buffers, acks' },
    { from: 'pconnect', to: 'pltl', label: 'starts LtlServer, implements LtlListener' },
    { from: 'pltl', to: 'ptds', label: 'TDS I/O' },
    { from: 'probe', to: 'pltl', label: 'uses (no Kafka)' },
  ],
  legend: L([lgStep, lgDec, { kind: 'term', text: 'Stand-alone tool' }, lnData], 900, 590, 280),
},

// 7 ─ Configuration dependencies
{
  id: '07-config-dependencies', name: 'Configuration dependencies',
  title: 'Configuration values that must agree with each other',
  subtitle: 'Each line joins two settings that must match. A mismatch is the most common setup failure; the right column names the symptom.',
  titleWidth: 1150,
  groups: [
    { id: 'gs', label: 'ASE side (DBA)', x: 20, y: 80, w: 320, h: 400, fill: '#ffe6cc', stroke: '#d79b00' },
    { id: 'gc', label: 'Connector config (JSON / KafkaConnector CR)', x: 400, y: 80, w: 330, h: 400, fill: '#dae8fc', stroke: '#6c8ebf' },
  ],
  nodes: [
    { id: 'a1', parent: 'gs', label: "interfaces: CDC_RS|host connect, port 11752", x: 20, y: 40, w: 280, kind: 'ext' },
    { id: 'a2', parent: 'gs', label: "sp_config_rep_agent ... 'enable'|'CDC_RS', 'rs_user', '<password>'", x: 20, y: 120, w: 280, kind: 'security' },
    { id: 'a3', parent: 'gs', label: "net password encryption = false", x: 20, y: 200, w: 280, kind: 'security' },
    { id: 'a4', parent: 'gs', label: '@@servername / database|MYSYBASE / phoenix_test', x: 20, y: 280, w: 280, kind: 'ext' },
    { id: 'b1', parent: 'gc', label: 'ltl.listen.port = 11752|+ Service / port mapping', x: 20, y: 40, w: 290 },
    { id: 'b2', parent: 'gc', label: 'ltl.username / ltl.password|from Secret', x: 20, y: 120, w: 290, kind: 'security' },
    { id: 'b3', parent: 'gc', label: 'plain password check|(no RSA handshake)', x: 20, y: 200, w: 290, kind: 'security' },
    { id: 'b4', parent: 'gc', label: 'database.server.name|database.name', x: 20, y: 280, w: 290 },
    { id: 's1', label: 'RepAgent: "Failed to connect"|retry every retry timeout', x: 790, y: 120, w: 260, kind: 'error' },
    { id: 's2', label: 'Login failed (Msg 4002)|RepAgent thread aborts', x: 790, y: 200, w: 260, kind: 'error' },
    { id: 's3', label: 'connect source refused|wrong database', x: 790, y: 360, w: 260, kind: 'error' },
  ],
  edges: [
    { from: 'a1', to: 'b1', both: true }, { from: 'a2', to: 'b2', both: true }, { from: 'a3', to: 'b3', both: true }, { from: 'a4', to: 'b4', both: true },
    { from: 'b1', to: 's1', label: 'mismatch', color: '#b85450', dashed: true },
    { from: 'b2', to: 's2', label: 'mismatch', color: '#b85450', dashed: true },
    { from: 'b4', to: 's3', label: 'mismatch', color: '#b85450', dashed: true },
  ],
  legend: L([lgExt, lgStep, lgSec, lgErr], 790, 460, 280),
},

// 8 ─ Docker topology
{
  id: '08-docker-topology', name: 'Docker topology',
  title: 'Local Docker topology (docker-compose.yml)',
  subtitle: 'Containers reach each other by service name on one bridge network. "host:" is the port published on localhost for you (isql, curl, browser); containers never use it.',
  titleWidth: 1150,
  groups: [
    { id: 'host', label: 'Windows host (Docker Desktop, WSL2 kernel 6.18)', x: 20, y: 80, w: 1160, h: 440, fill: '#f5f5f5' },
    { id: 'net', label: 'bridge network <project-folder>_default (172.20.0.0/16)', parent: 'host', x: 250, y: 40, w: 880, h: 370, fill: '#e8f4f8' },
  ],
  nodes: [
    { id: 'you', parent: 'host', label: 'You: isql, curl, browser|via published localhost ports', x: 20, y: 150, w: 190, kind: 'term' },
    { id: 'syb', parent: 'net', label: 'cdc-sybase (service sybase)|datagrip/sybase · ASE on 5000|host: localhost:5000|bind ./sybase → /scripts (ro)', x: 30, y: 50, w: 250, h: 90, kind: 'ext' },
    { id: 'con', parent: 'net', label: 'cdc-connect (service connect)|apache/kafka:3.8.0 · REST 8083, LTL 11752|host: localhost:8083, :11752|bind ./plugins → /opt/connectors', x: 400, y: 50, w: 280, h: 90 },
    { id: 'kaf', parent: 'net', label: 'cdc-kafka (service kafka)|apache/kafka:3.8.0, KRaft|internal kafka:9092 · host: localhost:29092', x: 400, y: 210, w: 280, h: 80, kind: 'data' },
    { id: 'ui', parent: 'net', label: 'cdc-kafka-ui|provectuslabs/kafka-ui|host: localhost:8080', x: 740, y: 210, w: 120, h: 80, kind: 'term' },
    { id: 'n1', parent: 'net', label: 'No named volumes: the ASE database lives in the container layer. "docker compose down" deletes it; "stop" / "restart" keep it.', x: 30, y: 300, w: 650, h: 50, shape: 'note' },
  ],
  edges: [
    { from: 'syb', to: 'con', label: 'LTL :11752', parent: 'net' },
    { from: 'con', to: 'kaf', label: 'kafka:9092', parent: 'net' },
    { from: 'ui', to: 'kaf', label: '9092', parent: 'net' },
    { from: 'ui', to: 'con', label: 'REST 8083', parent: 'net', dashed: true, exit: [0.5, 0], entry: [1, 0.5] },
    { from: 'you', to: 'net', label: 'localhost:*', dashed: true },
  ],
  legend: L([lgExt, lgStep, lgData, { line: true, dashed: true, text: 'Published host port / REST' }], 900, 540, 280),
},

// 9 ─ Local development & test workflow
{
  id: '09-local-workflow', name: 'Local workflow',
  title: 'Local development and test loop',
  subtitle: 'The loop used throughout this project. Every arrow is a script or command documented in the walkthrough.',
  titleWidth: 1100,
  nodes: [
    { id: 'a', label: 'Edit Java source|fix + add a test (.bin fixture)', x: 20, y: 130, w: 200 },
    { id: 'b', label: 'build.sh|mvn package in Docker', x: 260, y: 130, w: 190 },
    { id: 'c', label: 'Unit tests pass?', x: 490, y: 115, shape: 'decision' },
    { id: 'd', label: 'deploy-local.sh|copy JAR, restart Connect', x: 710, y: 130, w: 200 },
    { id: 'e', label: 'Connector RUNNING?|GET /status', x: 710, y: 250, w: 200, kind: 'decision' },
    { id: 'f', label: 'Run SQL in ASE|captures/isql.sh', x: 490, y: 250, w: 160, kind: 'ext' },
    { id: 'g', label: 'Read topic|consume.sh / analyze-topic.sh', x: 260, y: 250, w: 190, kind: 'data' },
    { id: 'h', label: 'Compare ASE rows vs events|counts, duplicates, order', x: 20, y: 250, w: 200, kind: 'decision' },
    { id: 'ok', label: 'Record evidence|docs/evidence', x: 20, y: 370, w: 200, shape: 'terminal', kind: 'data' },
  ],
  edges: [
    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd', label: 'yes', color: '#2D7600' },
    { from: 'c', to: 'a', label: 'no', color: '#B20000', exit: [0.5, 0], entry: [0.5, 0] },
    { from: 'd', to: 'e' }, { from: 'e', to: 'f' }, { from: 'f', to: 'g' }, { from: 'g', to: 'h' },
    { from: 'h', to: 'ok', label: 'match', color: '#2D7600' },
    { from: 'h', to: 'a', label: 'mismatch', color: '#B20000' },
  ],
  legend: L([lgStep, lgExt, lgData, lgDec], 490, 370, 280),
},

// 10 ─ Build & packaging
{
  id: '10-build-packaging', name: 'Build and packaging',
  title: 'From source code to a Kafka Connect plugin',
  subtitle: 'build.sh runs Maven inside maven:3.9-eclipse-temurin-17, so no JDK is needed on the host. connect-api and slf4j are "provided": the worker already has them.',
  titleWidth: 1150,
  nodes: [
    { id: 's', label: 'src/main/java|19 classes', x: 20, y: 90, w: 170 },
    { id: 'c', label: 'javac --release 17|maven-compiler', x: 230, y: 90, w: 170 },
    { id: 't', label: 'surefire tests|11 tests, real LTL fixtures', x: 440, y: 90, w: 190 },
    { id: 'r', label: 'src/main/resources|META-INF/services/...SourceConnector', x: 440, y: 200, w: 190 },
    { id: 'j', label: 'jar + shade|sybase-cdc-connector-0.1.0.jar', x: 670, y: 90, w: 210, kind: 'data' },
    { id: 'p', label: 'plugins/sybase-cdc/|bind-mounted at /opt/connectors', x: 920, y: 90, w: 210 },
    { id: 'w', label: 'Worker scans plugin.path|isolated classloader', x: 920, y: 200, w: 210, kind: 'ext' },
    { id: 'l', label: 'GET /connector-plugins|lists SybaseCdcSourceConnector', x: 920, y: 310, w: 210, kind: 'decision' },
    { id: 'n', label: 'provided (not in JAR): connect-api 3.8.0, slf4j-api 1.7.36. test: junit 5.10.2. No runtime dependencies, so the shaded JAR equals the plain JAR (same SHA-256).', x: 20, y: 310, w: 600, h: 60, shape: 'note' },
  ],
  edges: [
    { from: 's', to: 'c' }, { from: 'c', to: 't' }, { from: 't', to: 'j' },
    { from: 'r', to: 'j', label: 'copied in', exit: [1, 0.5], entry: [0.3, 1] },
    { from: 'j', to: 'p', label: 'cp' }, { from: 'p', to: 'w' }, { from: 'w', to: 'l' },
  ],
  legend: L([lgStep, lgData, lgExt, lgDec], 650, 310, 250),
},

// 11 ─ OpenShift deployment architecture
{
  id: '11-openshift-architecture', name: 'OpenShift deployment',
  title: 'Target deployment on OpenShift (proposed, not yet deployed)',
  subtitle: 'ASE runs outside the cluster, so RepAgent needs a TCP path to the single Connect pod running the task. OpenShift Routes carry HTTP/TLS-SNI only, so use a LoadBalancer or NodePort Service.',
  titleWidth: 1200,
  groups: [
    { id: 'dc', label: 'Bank data centre', x: 20, y: 90, w: 260, h: 420, fill: '#ffe6cc', stroke: '#d79b00' },
    { id: 'oc', label: 'OpenShift cluster', x: 330, y: 90, w: 860, h: 420, fill: '#f5f5f5' },
    { id: 'ns', label: 'namespace: cdc (Event Streams or Confluent operator)', parent: 'oc', x: 20, y: 40, w: 820, h: 360, fill: '#e8f4f8' },
  ],
  nodes: [
    { id: 'ase', parent: 'dc', label: 'ASE 16.0 SP04 PL07|RepAgent', x: 50, y: 50, w: 170, kind: 'ext' },
    { id: 'ifc', parent: 'dc', label: 'interfaces: CDC_RS|LB VIP / node IP : port', x: 40, y: 150, w: 190, kind: 'plain' },
    { id: 'fw', parent: 'dc', label: 'Firewall rule|ASE host → VIP:11752 only', x: 40, y: 250, w: 190, kind: 'security' },
    { id: 'svc', parent: 'ns', label: 'Service cdc-ltl|type LoadBalancer / NodePort', x: 20, y: 50, w: 200 },
    { id: 'np', parent: 'ns', label: 'NetworkPolicy|allow ASE CIDR → pod:11752', x: 20, y: 170, w: 200, kind: 'security' },
    { id: 'pod', parent: 'ns', label: 'KafkaConnect pod (replicas: 1)|custom image with connector JAR', x: 280, y: 50, w: 260, h: 70 },
    { id: 'kc', parent: 'ns', label: 'KafkaConnector CR|sybase-cdc-phoenix, tasksMax 1', x: 280, y: 170, w: 260 },
    { id: 'sec', parent: 'ns', label: 'Secret|ltl password, Kafka creds', x: 280, y: 270, w: 260, kind: 'security' },
    { id: 'kafka', parent: 'ns', label: 'Kafka cluster|TLS + SCRAM/mTLS', x: 610, y: 45, w: 190, shape: 'db', kind: 'data', h: 80 },
    { id: 'reg', parent: 'ns', label: 'Approved image registry|digest-pinned', x: 610, y: 170, w: 190, kind: 'ext' },
    { id: 'mon', parent: 'ns', label: 'Monitoring|scrapes Connect JMX metrics, alerts', x: 610, y: 270, w: 190, kind: 'decision' },
  ],
  edges: [
    { from: 'ase', to: 'ifc', parent: 'dc' }, { from: 'ifc', to: 'fw', parent: 'dc' },
    { from: 'fw', to: 'svc', label: 'TCP 11752', exit: [1, 0.5], entry: [0, 0.5] }, { from: 'svc', to: 'pod', parent: 'ns' },
    { from: 'np', to: 'svc', label: 'guards', dashed: true, parent: 'ns' }, { from: 'kc', to: 'pod', label: 'config', parent: 'ns' },
    { from: 'sec', to: 'kc', dashed: true, parent: 'ns' }, { from: 'pod', to: 'kafka', label: 'produce', parent: 'ns', exit: [1, 0.35], entry: [0, 0.5] },
    { from: 'reg', to: 'pod', label: 'image', dashed: true, parent: 'ns', exit: [0, 0.5], entry: [1, 0.85] },
  ],
  legend: L([lgExt, lgStep, lgData, lgSec, lgDec], 20, 540, 300),
},

// 12 ─ Configuration and secret flow
{
  id: '12-secret-config-flow', name: 'Secret and configuration flow',
  title: 'Configuration and secret management flow',
  subtitle: 'The RepAgent password exists in two places that must stay equal: ASE (set by the DBA) and the connector (from a Secret). The CRs live in Git without secrets; nothing secret goes into Git or the image.',
  titleWidth: 1150,
  nodes: [
    { id: 'vault', label: 'Bank secret store|vault / sealed secret', x: 20, y: 100, w: 200, kind: 'security' },
    { id: 'dba', label: 'DBA change ticket|sp_config_rep_agent', x: 20, y: 240, w: 200, kind: 'ext' },
    { id: 'ase', label: 'ASE RepAgent config|rs username / rs password', x: 280, y: 240, w: 210, kind: 'ext' },
    { id: 'sec', label: 'OpenShift Secret|sybase-cdc-ltl', x: 280, y: 100, w: 210, kind: 'security' },
    { id: 'kcr', label: 'KafkaConnect CR|externalConfiguration / config provider', x: 550, y: 100, w: 240 },
    { id: 'cr', label: 'KafkaConnector CR|ltl.password = secret reference', x: 860, y: 100, w: 230 },
    { id: 'task', label: 'Task authenticates|RepAgent login', x: 550, y: 240, w: 240 },
  ],
  edges: [
    { from: 'vault', to: 'sec', label: 'sync' }, { from: 'vault', to: 'dba', label: 'same value', dashed: true },
    { from: 'dba', to: 'ase' }, { from: 'sec', to: 'kcr', label: 'mounted' }, { from: 'kcr', to: 'cr', label: 'resolves' },
    { from: 'cr', to: 'task', exit: [0.5, 1], entry: [1, 0.5] }, { from: 'ase', to: 'task', label: 'TDS login' },
  ],
  legend: L([lgSec, lgExt, lgStep, lgData], 20, 340, 280),
},

// 13 ─ Error handling & retry flow
{
  id: '13-error-retry-flow', name: 'Error handling and retry',
  title: 'Error handling and recovery paths (all verified in tests 4–7 unless marked)',
  subtitle: 'Every failure ends in the same safe place: RepAgent re-sends from the last truncation point the connector gave it, and duplicates are dropped by commit OQID or by consumers.',
  titleWidth: 1200,
  nodes: [
    { id: 'f1', label: 'Unparsable LTL|(not seen in tests)', x: 20, y: 100, w: 190, kind: 'error' },
    { id: 'f2', label: 'Connect worker killed|test 4b, 6b', x: 240, y: 100, w: 190, kind: 'error' },
    { id: 'f3', label: 'Kafka unreachable|test P5 (44 s pause)', x: 460, y: 100, w: 190, kind: 'error' },
    { id: 'f4', label: 'ASE crash|test 5', x: 680, y: 100, w: 190, kind: 'error' },
    { id: 'f5', label: 'Connector stopped long|test 7', x: 900, y: 100, w: 190, kind: 'error' },
    { id: 'a1', label: 'drop TDS connection|never acknowledge', x: 20, y: 220, w: 190 },
    { id: 'a2', label: 'socket closes|offsets: last full txn', x: 240, y: 220, w: 190 },
    { id: 'a3', label: 'no producer ack|truncation frozen', x: 460, y: 220, w: 190 },
    { id: 'a4', label: 'ASE recovery|RepAgent auto start', x: 680, y: 220, w: 190, kind: 'ext' },
    { id: 'a5', label: 'log grows|threshold alert at 75% free', x: 900, y: 220, w: 190, kind: 'decision' },
    { id: 'k3', label: '>10 s outage: worker rebalances|task restarts (seen in P5)', x: 460, y: 330, w: 190, h: 70, kind: 'decision' },
    { id: 'r', label: 'RepAgent reconnects after retry timeout (10 s here) and asks: get truncation', x: 20, y: 450, w: 1070, h: 46, kind: 'ext' },
    { id: 'g', label: 'Connector answers the last Kafka-acknowledged commit OQID|RepAgent re-sends everything after it', x: 340, y: 550, w: 430 },
    { id: 'd', label: 'Re-sent transactions with commit OQID ≤ last queued are skipped|anything still duplicated carries the same source.oqid for consumers', x: 340, y: 660, w: 430, kind: 'data' },
  ],
  edges: [
    { from: 'f1', to: 'a1' }, { from: 'f2', to: 'a2' }, { from: 'f3', to: 'a3' }, { from: 'f4', to: 'a4' }, { from: 'f5', to: 'a5' },
    { from: 'a1', to: 'r', entry: [0.0888, 0] }, { from: 'a2', to: 'r', entry: [0.2944, 0] }, { from: 'a3', to: 'k3' },
    { from: 'k3', to: 'r', entry: [0.5, 0] }, { from: 'a4', to: 'r', entry: [0.7056, 0] }, { from: 'a5', to: 'r', label: 'resume', entry: [0.9112, 0] },
    { from: 'r', to: 'g' }, { from: 'g', to: 'd' },
  ],
  legend: L([lgErr, lgStep, lgExt, lgDec, lgData], 820, 550, 270),
},

// 14 ─ Troubleshooting decision tree
{
  id: '14-troubleshooting-tree', name: 'Troubleshooting tree',
  title: 'Troubleshooting: "changes are not reaching Kafka"',
  subtitle: 'Work top to bottom. Each question names the command that answers it (see the runbooks chapter).',
  titleWidth: 1150,
  nodes: [
    { id: 'q1', label: 'Task RUNNING?|GET /status', x: 40, y: 80, shape: 'decision' },
    { id: 'q2', label: 'RepAgent running?|sp_help_rep_agent', x: 40, y: 210, shape: 'decision' },
    { id: 'q3', label: '"RepAgent connected"|in Connect log?', x: 40, y: 340, shape: 'decision' },
    { id: 'q4', label: 'Table marked?|sp_setreptable', x: 40, y: 470, shape: 'decision' },
    { id: 'q5', label: 'Transaction committed?', x: 40, y: 600, shape: 'decision' },
    { id: 'r1', label: 'Connector layer|read trace in /status, worker log; fix config, restart task', x: 260, y: 95, w: 300, kind: 'error' },
    { id: 'r2', label: 'Database layer|errorlog: login failed? comms error? sp_start_rep_agent', x: 260, y: 225, w: 300, kind: 'error' },
    { id: 'r3', label: 'Network layer|interfaces host/port, firewall, Service, NetworkPolicy, retry timeout', x: 260, y: 355, w: 300, kind: 'error' },
    { id: 'r4', label: 'Replication marking|sp_setreptable <table>, true', x: 260, y: 485, w: 300, kind: 'error' },
    { id: 'r5', label: 'By design: open or rolled-back transactions are never published', x: 260, y: 615, w: 300, kind: 'decision' },
    { id: 'r6', label: 'Kafka layer|table.include.list, topic name, consumer offsets, ACLs', x: 0, y: 740, w: 240, h: 70, kind: 'error' },
  ],
  edges: [
    { from: 'q1', to: 'r1', label: 'no', color: '#B20000' }, { from: 'q1', to: 'q2', label: 'yes', color: '#2D7600' },
    { from: 'q2', to: 'r2', label: 'no', color: '#B20000' }, { from: 'q2', to: 'q3', label: 'yes', color: '#2D7600' },
    { from: 'q3', to: 'r3', label: 'no', color: '#B20000' }, { from: 'q3', to: 'q4', label: 'yes', color: '#2D7600' },
    { from: 'q4', to: 'r4', label: 'no', color: '#B20000' }, { from: 'q4', to: 'q5', label: 'yes', color: '#2D7600' },
    { from: 'q5', to: 'r5', label: 'no', color: '#B20000' }, { from: 'q5', to: 'r6', label: 'yes', color: '#2D7600' },
  ],
  legend: L([lgDec, lgErr], 620, 80, 260),
},

// 15 ─ Production deployment & rollback
{
  id: '15-deploy-rollback', name: 'Deployment and rollback',
  title: 'Production release and rollback workflow (proposed)',
  subtitle: 'Promotion is by image digest. Rollback never touches ASE log truncation: the previous connector version resumes from the stored offset.',
  titleWidth: 1150,
  nodes: [
    { id: 'a', label: 'Build + unit tests|CI, pinned Maven image', x: 20, y: 90, w: 190 },
    { id: 'b', label: 'SHA-256 of JAR|record in release', x: 250, y: 90, w: 190 },
    { id: 'c', label: 'Build Connect image|scan, sign, push', x: 480, y: 90, w: 190, kind: 'security' },
    { id: 'd', label: 'Change approval|CAB, DBA sign-off', x: 710, y: 90, w: 190, kind: 'decision' },
    { id: 'e', label: 'Update KafkaConnect|image@sha256:...', x: 710, y: 210, w: 190 },
    { id: 'f', label: 'Rollout healthy?|status, RepAgent connected, test txn', x: 480, y: 195, shape: 'decision', w: 190 },
    { id: 'g', label: 'Release done|monitor 24 h', x: 250, y: 210, w: 190, shape: 'terminal', kind: 'data' },
    { id: 'h', label: 'Rollback|previous digest; offsets kept', x: 480, y: 330, w: 190, kind: 'error' },
    { id: 'i', label: 'Verify catch-up|no gaps by OQID', x: 250, y: 330, w: 190, kind: 'decision' },
  ],
  edges: [
    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }, { from: 'd', to: 'e', label: 'approved' },
    { from: 'e', to: 'f' }, { from: 'f', to: 'g', label: 'yes', color: '#2D7600' }, { from: 'f', to: 'h', label: 'no', color: '#B20000' },
    { from: 'h', to: 'i' },
  ],
  legend: L([lgStep, lgSec, lgDec, lgErr, lgData], 720, 320, 260),
},

// 16 ─ LTL handshake sequence
{
  id: '16-ltl-handshake', name: 'LTL handshake',
  title: 'RepAgent ↔ connector session (LTL 760, captured on the wire)',
  titleWidth: 1100,
  seq: {
    x0: 40, gap: 380, top: 50, step: 46,
    participants: [
      { id: 'ra', label: 'RepAgent|inside ASE', kind: 'ext' },
      { id: 'cn', label: 'Connector|CDC_RS :11752' },
      { id: 'k', label: 'Kafka', kind: 'data' },
    ],
    messages: [
      { from: 'ra', to: 'cn', text: 'TDS login: rs_user, packet size 2048, iso_1' },
      { from: 'cn', to: 'ra', text: 'LOGINACK + CAPABILITY + ENVCHANGE(2048) + DONE', reply: true },
      { from: 'ra', to: 'cn', text: 'connect source lti "MYSYBASE"."phoenix_test" 760 passthru' },
      { from: 'cn', to: 'ra', text: 'VERSION 760 | Sysversion 1600 + UpgradeLocater', reply: true },
      { from: 'ra', to: 'cn', text: 'get maintenance user for ...' },
      { from: 'cn', to: 'ra', text: 'cdc_maint', reply: true },
      { from: 'ra', to: 'cn', text: 'get truncation ...' },
      { from: 'cn', to: 'ra', text: '36-byte OQID (zeros on first start)', reply: true },
      { frame: 'loop: each LTL batch', span: 2 },
      { from: 'ra', to: 'cn', text: 'distribute ... begin / applied / commit' },
      { from: 'cn', to: 'ra', text: 'DONE (exactly one per TDS message)', reply: true },
      { from: 'cn', to: 'k', text: 'produce (after COMMIT only)' },
      { from: 'k', to: 'cn', text: 'ack → commitRecord()', reply: true, color: '#9a6100' },
      { from: 'ra', to: 'cn', text: 'get truncation (~every 15 s)' },
      { from: 'cn', to: 'ra', text: 'acked OQID → secondary truncation point moves', reply: true, color: '#9a6100' },
    ],
  },
},

// 17 ─ Acknowledgement watermark
{
  id: '17-ack-watermark', name: 'Acknowledgement watermark',
  title: 'Why ASE never frees log that is not in Kafka',
  subtitle: 'Transactions finish in commit order T1, T2, T3. Kafka may acknowledge T2 before T1. The watermark only moves past a transaction when it and everything before it is fully acknowledged.',
  titleWidth: 1100,
  nodes: [
    { id: 't1', label: 'T1: 2 records|1 acked', x: 20, y: 100, w: 170, kind: 'decision' },
    { id: 't2', label: 'T2: 1 record|acked', x: 220, y: 100, w: 170, kind: 'data' },
    { id: 't3', label: 'T3: 0 records|(other tables only)', x: 420, y: 100, w: 170, kind: 'data' },
    { id: 'w', label: 'watermark = before T1|get truncation returns it', x: 20, y: 220, w: 170, kind: 'step' },
    { id: 'n', label: 'When T1\'s 2nd record is acked, the watermark jumps to T3 in one step (AckTrackerTest proves this).', x: 220, y: 210, w: 370, h: 60, shape: 'note' },
    { id: 'o', label: 'Connect offsets: only the LAST record of a transaction carries its commit OQID (fix verified by test 6b).', x: 620, y: 100, w: 320, h: 70, shape: 'note' },
  ],
  edges: [{ from: 't1', to: 't2' }, { from: 't2', to: 't3' }, { from: 't1', to: 'w', dashed: true, color: '#9a6100' }],
  legend: L([lgDec, lgData, lgStep], 620, 210, 280),
},
];
