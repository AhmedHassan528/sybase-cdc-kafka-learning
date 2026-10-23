// Reads the output of lab/env/consume.sh on stdin ("<key> | <value>" per line) and checks the three events of a demonstration row.
// Usage: ... | node lab/path/demo/check-topic.js <tag> [topic]      exit 0 = PASS, 1 = the events are not (yet) as expected
const tag = process.argv[2];
const topic = process.argv[3] || 'sybase.phoenix_test.payment';
const lines = require('fs').readFileSync(0, 'utf8').split('\n').filter(l => l.includes(' | '));
const events = [];
for (const l of lines) {
  const i = l.indexOf(' | ');
  let key, val;
  try { key = l.slice(0, i); val = JSON.parse(l.slice(i + 3)); } catch (e) { continue; }
  const row = val.after || val.before;
  if (row && row.account_no === tag) events.push({ key, op: val.op, before: val.before, after: val.after });
}
const amount = r => (r ? r.amount : '-');
console.log('op  key                      before.amount  after.amount');
for (const e of events) console.log(`${e.op.padEnd(3)} ${e.key.padEnd(24)} ${String(amount(e.before)).padEnd(14)} ${amount(e.after)}`);
const ops = events.map(e => e.op).join('');
const problems = [];
if (ops !== 'cud') problems.push(`expected the operations c, u, d in order, found "${ops || 'none'}"`);
else {
  if (new Set(events.map(e => e.key)).size !== 1) problems.push('the three events do not share one key');
  if (!(events[0].after.amount === '10' && events[1].before.amount === '10' && events[1].after.amount === '25.5' && events[2].before.amount === '25.5')) problems.push('the amounts do not follow "10", "25.5" (decimals arrive as strings without trailing zeros)');
}
if (problems.length) { console.log('FAIL: ' + problems.join('; ')); process.exit(1); }
console.log(`PASS: 3 events for ${tag} on ${topic}: c, u, d with the same key and the amounts as written (10, then 25.5)`);
