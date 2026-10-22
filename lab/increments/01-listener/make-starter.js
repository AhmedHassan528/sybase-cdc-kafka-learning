// Generates starter/ from ../../solutions/01-listener: the same files, with the bodies the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '01-listener');
const OUT = path.join(__dirname, 'starter');

function copy(rel) {
  const from = path.join(SOL, rel), to = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
// Given: everything except the two classes the learner writes.
['src/main/java/com/phoenix/cdc/sybase/tds/TdsChannel.java', 'src/main/java/com/phoenix/cdc/sybase/tds/TdsLogin.java',
 'src/main/java/com/phoenix/cdc/sybase/tds/TdsTokens.java', 'src/main/java/com/phoenix/cdc/sybase/ltl/LtlListener.java',
 'src/main/java/com/phoenix/cdc/lab/Increment1Main.java'].forEach(copy);

// Replace the body of the method whose signature line contains `sig` with `body` (lines, already indented).
function stub(src, sig, body) {
  const lines = src.split('\n');
  const i = lines.findIndex(l => l.includes(sig));
  if (i < 0) throw new Error('signature not found: ' + sig);
  let depth = 0, j = i, opened = false;
  for (; j < lines.length; j++) {
    for (const ch of lines[j]) { if (ch === '{') { depth++; opened = true; } else if (ch === '}') depth--; }
    if (opened && depth === 0) break;
  }
  // keep the signature line(s) up to and including the opening brace, drop the rest of the body
  lines.splice(i + 1, j - i - 1, ...body);
  return lines.join('\n');
}

let server = fs.readFileSync(path.join(SOL, 'src/main/java/com/phoenix/cdc/sybase/ltl/LtlServer.java'), 'utf8');
server = stub(server, 'public void start() throws IOException {', [
  '        // TODO 1 (checkpoint 6): create a ServerSocket, set SO_REUSEADDR, bind it to host:port, keep it in the field',
  '        //   serverSocket, start the accept thread (a daemon thread running acceptLoop) and log the listening port.',
  '        //   A test asks for port 0, so log and name the thread with the port actually bound (ss.getLocalPort()).',
  '        throw new UnsupportedOperationException("increment 1: LtlServer.start()");']);
server = stub(server, 'private void acceptLoop() {', [
  '        // TODO 2 (checkpoints 1 to 5): while the server socket is open, accept a client, set TCP_NODELAY and',
  '        //   keep-alive, remember the socket in `clients`, and run `new LtlSession(s, listener, trace, charsetOverride).run()`',
  '        //   on a new daemon thread (one thread per RepAgent connection). Remove the socket from `clients` when the',
  '        //   session ends. Log (do not throw) an accept error unless the server is being closed.',
  '        throw new UnsupportedOperationException("increment 1: LtlServer.acceptLoop()");']);
server = stub(server, 'public void close() {', [
  '        // TODO 3 (checkpoint 6): close the server socket, close every client socket in `clients`, wait up to 5 s for the',
  '        //   accept thread to end, and log that the server stopped.',
  '        throw new UnsupportedOperationException("increment 1: LtlServer.close()");']);
fs.writeFileSync(path.join(OUT, 'src/main/java/com/phoenix/cdc/sybase/ltl/LtlServer.java'), server);

let session = fs.readFileSync(path.join(SOL, 'src/main/java/com/phoenix/cdc/sybase/ltl/LtlSession.java'), 'utf8');
session = stub(session, 'private void login(byte[] payload) throws IOException {', [
  '        // TODO 4 (checkpoints 1 and 2): answer the TDS login.',
  '        //   - TdsLogin.parse(payload) gives user, password, byte order, character set, packet size, capability token.',
  '        //   - remember the byte order (`order`) and character set (`charset`; `charsetOverride` wins if set).',
  '        //   - ask listener.authenticate(user, password).',
  '        //   - refused: send message(4002, 14, "Login failed for user ...", SERVER_NAME), loginAck(false, ...) and',
  '        //     done(DONE_ERROR, 0) in one response and return.',
  '        //   - accepted: send loginAck(true, "Replication Server", {16,0,0,0}), the capability token echoed back with',
  '        //     raw(...) when the client sent one, envChange(ENV_PACKETSIZE, <packet size>, "512") and done(DONE_FINAL, 0),',
  '        //     then switch the channel to that packet size with ch.setPacketSize(...).',
  '        //   Build responses with tokens() and send them with ch.sendResponse(tokens.bytes()).',
  '        throw new UnsupportedOperationException("increment 1: LtlSession.login()");']);
session = stub(session, 'private void tokenStream(byte[] p) throws IOException, InterruptedException {', [
  '        // TODO 5 (checkpoint 3): RepAgent sends "connect source" as a TDS 5.0 token stream, not as plain language text.',
  '        //   A LANGUAGE token is: byte 0x21, u32 length (in the client\'s byte order, `order`), u8 status, then the text.',
  '        //   Extract the text (length - 1 bytes after the 6 header bytes) and pass it to language(...).',
  '        //   Anything else: log a warning and answer with done(DONE_FINAL, 0).',
  '        throw new UnsupportedOperationException("increment 1: LtlSession.tokenStream()");']);
session = stub(session, 'private void language(byte[] raw) throws IOException, InterruptedException {', [
  '        // TODO 6 (checkpoints 3, 4 and 5): decide what the text is and answer it.',
  '        //   Read it as ISO-8859-1 so offsets match the bytes. Then:',
  '        //   - starts with "connect source": match CONNECT_SOURCE to get server, database and the proposed LTL version;',
  '        //     ask listener.onConnectSource(...) (a RuntimeException means refuse: message(32001, 16, ...) + done(DONE_ERROR));',
  '        //     answer with two result sets: rowFormat(VERSION_COLS) + row(version) + done(DONE_MORE | DONE_COUNT, 1), then',
  '        //     rowFormat(SYSVERSION_COLS) + row(RS_SYSVERSION, new byte[UPGRADE_LOCATOR_LEN]) + done(DONE_COUNT, 1).',
  '        //   - starts with "get maintenance user": one row (MAINT_COLS) with listener.maintenanceUser(server, database).',
  '        //   - starts with "get truncation": one row (TRUNC_COLS) with listener.truncationPoint(server, database).',
  '        //   - anything else that does not start with "get ": it is LTL data. Hand the raw bytes to listener.onLtl(raw) and',
  '        //     answer with exactly one done(DONE_FINAL, 0).',
  '        //   - other "get ..." commands: log a warning and answer done(DONE_FINAL, 0).',
  '        throw new UnsupportedOperationException("increment 1: LtlSession.language()");']);
fs.writeFileSync(path.join(OUT, 'src/main/java/com/phoenix/cdc/sybase/ltl/LtlSession.java'), session);

let pom = fs.readFileSync(path.join(SOL, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 1. The tests are shared with the starter (lab/increments/01-listener/tests).',
                  'Starter of increment 1: your working copy. The tests are in lab/increments/01-listener/tests.')
         .split('../../increments/01-listener/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
