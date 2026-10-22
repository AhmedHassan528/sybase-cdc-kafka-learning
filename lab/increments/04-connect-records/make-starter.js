// Generates starter/ from ../../solutions/04-connect-records: the same files, with the code the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '04-connect-records');
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
const F = 'src/main/java/com/phoenix/cdc/sybase/connect/ChangeEventMapper.java';
stub(F, 'ChangeEventMapper(String server, String database, String topicPrefix) {', [
  '        // TODO 1: keep the three values in the fields above.',
  '        throw new UnsupportedOperationException("increment 4: ChangeEventMapper()");']);
stub(F, 'String topic(LtlCommand c) {', [
  '        // TODO 2 (checkpoint 1): the topic is <topicPrefix>.<database>.<table>, for example sybase.phoenix_test.payment.',
  '        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.topic()");']);
stub(F, 'Map<String, Object> key(LtlCommand c) {', [
  '        // TODO 3 (checkpoints 2 and 3): the key holds the primary key columns (c.keyColumns()) with their values, in that order',
  '        //   (use a LinkedHashMap). Take the values from the after image, or from the before image when there is no after',
  '        //   image (a delete). A table with no key columns gets no key: return null.',
  '        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.key()");']);
stub(F, 'Map<String, Object> value(LtlCommand c, CommittedTransaction tx, int seq) {', [
  '        // TODO 4 (checkpoints 4 to 8): build the value as a LinkedHashMap with the keys in THIS order:',
  '        //   op       "c" for INSERT, "u" for UPDATE, "d" for DELETE; any other kind: throw IllegalArgumentException',
  '        //   before   c.before()        (null when the command has none)',
  '        //   after    c.after()',
  '        //   source   a LinkedHashMap, in this order:',
  '        //              server (the field), db (the field `database`), owner (c.owner()), table (c.table()),',
  '        //              xid (tx.tranId()), oqid (Oqid.hex(c.oqid())), commit_oqid (Oqid.hex(tx.commitOqid())),',
  '        //              commit_time (tx.commitTime()), user (tx.user()),',
  '        //              seq (the argument, as a long: it is this row\'s position in the transaction),',
  '        //              txn_rows (tx.changes().size(), as a long)',
  '        //   ts_ms    System.currentTimeMillis()',
  '        throw new UnsupportedOperationException("increment 4: ChangeEventMapper.value()");']);

let pom = fs.readFileSync(path.join(OUT, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 4. The tests are shared with the starter (lab/increments/04-connect-records/tests).',
                  'Starter of increment 4: your working copy. The tests are in lab/increments/04-connect-records/tests.')
         .split('../../increments/04-connect-records/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
