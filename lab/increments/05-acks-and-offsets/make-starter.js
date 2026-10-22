// Generates starter/ from ../../solutions/05-acks-and-offsets: the same files, with the code the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '05-acks-and-offsets');
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
const F = 'src/main/java/com/phoenix/cdc/sybase/cdc/AckTracker.java';
stub(F, 'public AckTracker(byte[] initial) {', [
  '        // TODO 1 (checkpoint 4): remember the starting position (the position stored by an earlier run, or null) as the',
  '        //   current watermark `acked`.',
  '        throw new UnsupportedOperationException("increment 5: AckTracker()");']);
stub(F, 'public synchronized Pending register(byte[] commitOqid, int records) {', [
  '        // TODO 2 (checkpoints 1 to 4): a transaction was committed and produced `records` Kafka records.',
  '        //   Create a Pending for it, add it at the END of the queue (transactions are registered in commit order), move the',
  '        //   watermark forward if it can move (advance()), and return the Pending.',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.register()");']);
stub(F, 'public synchronized void ack(Pending p) {', [
  '        // TODO 3 (checkpoints 2 and 3): Kafka confirmed one record of that transaction: count it down, then advance().',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.ack()");']);
stub(F, 'public synchronized byte[] acked() {', [
  '        // TODO 4: the current watermark (null if nothing has been confirmed and there was no starting position).',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.acked()");']);
stub(F, 'public synchronized int inFlight() {', [
  '        // TODO 5 (checkpoint 5): how many registered transactions are not done yet.',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.inFlight()");']);
stub(F, 'public synchronized void reset() {', [
  '        // TODO 6 (checkpoint 6): forget the transactions in flight; keep the watermark.',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.reset()");']);
stub(F, 'private void advance() {', [
  '        // TODO 7 (checkpoints 1 to 3): the heart of the class. While the transaction at the FRONT of the queue has no records',
  '        //   left to confirm, remove it and make its commit oqid the new watermark. Stop at the first transaction that still',
  '        //   waits: a later transaction that is already done must not move the watermark past it.',
  '        throw new UnsupportedOperationException("increment 5: AckTracker.advance()");']);

let pom = fs.readFileSync(path.join(OUT, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 5. The tests are shared with the starter (lab/increments/05-acks-and-offsets/tests).',
                  'Starter of increment 5: your working copy. The tests are in lab/increments/05-acks-and-offsets/tests.')
         .split('../../increments/05-acks-and-offsets/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
