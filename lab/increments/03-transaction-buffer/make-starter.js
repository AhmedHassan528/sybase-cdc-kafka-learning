// Generates starter/ from ../../solutions/03-transaction-buffer: the same files, with the code the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '03-transaction-buffer');
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
const F = 'src/main/java/com/phoenix/cdc/sybase/cdc/TransactionBuffer.java';
stub(F, 'public Optional<CommittedTransaction> accept(LtlCommand c) {', [
  '        // TODO 1 (checkpoints 1 to 7): feed one command; return the finished transaction when it is a COMMIT.',
  '        //   Key the open transactions by the transaction id as lower-case hex text (HexFormat.of().formatHex(c.tranId()), or ""',
  '        //   when the id is missing). Use the `open` map and the Open class above. By c.kind():',
  '        //   BEGIN     -> start a new Open for that id and remember the user (c.user()).',
  '        //   INSERT / UPDATE / DELETE -> add the command to that transaction\'s changes. Create the Open if there is none yet:',
  '        //                RepAgent can restart inside a transaction, so the BEGIN may have been sent in an earlier connection.',
  '        //                When the transaction reaches `warnRowsPerTxn` rows, log one warning (use the `warned` flag).',
  '        //   COMMIT    -> remove the Open; remember c.oqid() as the last commit position; return a CommittedTransaction with',
  '        //                (id, c.oqid(), c.originTime(), the user or null, the rows or an empty list). A COMMIT is ALWAYS reported,',
  '        //                even with no rows, so the caller can move its position forward.',
  '        //   ROLLBACK  -> remove the Open and throw its rows away; return Optional.empty().',
  '        //   OTHER     -> log at debug level and ignore.',
  '        //   Every other case returns Optional.empty().',
  '        throw new UnsupportedOperationException("increment 3: TransactionBuffer.accept()");']);
stub(F, 'public int openTransactions() {', [
  '        // TODO 2 (checkpoints 1 to 3 and 7): how many transactions are open right now.',
  '        throw new UnsupportedOperationException("increment 3: TransactionBuffer.openTransactions()");']);
stub(F, 'public byte[] lastCommitOqid() {', [
  '        // TODO 3 (checkpoint 4): the oqid of the last COMMIT that accept() reported, or null before the first one.',
  '        throw new UnsupportedOperationException("increment 3: TransactionBuffer.lastCommitOqid()");']);
stub(F, 'public void clear() {', [
  '        // TODO 4 (checkpoint 7): RepAgent reconnected and will send everything after the truncation point again, so forget',
  '        //   every open transaction.',
  '        throw new UnsupportedOperationException("increment 3: TransactionBuffer.clear()");']);

let pom = fs.readFileSync(path.join(OUT, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 3. The tests are shared with the starter (lab/increments/03-transaction-buffer/tests).',
                  'Starter of increment 3: your working copy. The tests are in lab/increments/03-transaction-buffer/tests.')
         .split('../../increments/03-transaction-buffer/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
