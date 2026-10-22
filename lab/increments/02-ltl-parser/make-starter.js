// Generates starter/ from ../../solutions/02-ltl-parser: the same files, with the code the learner writes replaced
// by hinted TODOs. Run: node make-starter.js   (the starter is committed; this script documents how it was made)
const fs = require('fs');
const path = require('path');
const SOL = path.join(__dirname, '..', '..', 'solutions', '02-ltl-parser');
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

// Replace the body of the method whose signature line contains `sig` with `body` (lines, already indented).
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
const L = 'src/main/java/com/phoenix/cdc/sybase/ltl/';

// --- LtlValues: five methods ---
stub(L + 'LtlValues.java', 'static Object convert(Token t, Charset cs) {', [
  '        // TODO 1 (checkpoints 1 to 5): turn one value token into a Java value. See the table at the top of this class.',
  '        //   BARE token: "NULL" (any case) -> null; otherwise try Long.parseLong, and fall back to the text.',
  '        //   VALUE token: switch on t.marker():',
  '        //     " # 9        text in the connection charset `cs`                       -> String',
  '        //     6 7 <        unichar / univarchar, UTF-16 big-endian                    -> String',
  '        //     , - :        binary / varbinary                                         -> byte[] (t.data())',
  '        //     % 0          numeric / decimal, keep exact                              -> String via decimal(...)',
  '        //     ( )          money / smallmoney: drop a leading "$", keep exact         -> String via decimal(...)',
  '        //     & \'          float / real                                               -> Double (fall back to the text)',
  '        //     * + E        datetime / smalldatetime / bigdatetime                     -> dateTime(...)',
  '        //     =            date                                                       -> date(...)',
  '        //     >            time                                                       -> time(...)',
  '        //     anything else: log once per marker (the `warned` set) and return the text',
  '        throw new UnsupportedOperationException("increment 2: LtlValues.convert()");']);
stub(L + 'LtlValues.java', 'static String decimal(String s) {', [
  '        // TODO 2 (checkpoint 3 and 6): ASE sends numeric(18,2) 100.00 as "100." and 100.50 as "100.5". Drop a dangling ".".',
  '        throw new UnsupportedOperationException("increment 2: LtlValues.decimal()");']);
stub(L + 'LtlValues.java', 'static String dateTime(String s) {', [
  '        // TODO 3 (checkpoints 5 and 6): "20261020 13:45:56:123" -> "2026-10-20T13:45:56.123" (also with .123456).',
  '        //   Return the input unchanged when it is too short or has no space at index 8. Use date(...) and time(...).',
  '        throw new UnsupportedOperationException("increment 2: LtlValues.dateTime()");']);
stub(L + 'LtlValues.java', 'static String date(String s) {', [
  '        // TODO 4 (checkpoints 5 and 6): "20261020" -> "2026-10-20". Return the input unchanged unless it has 8 characters.',
  '        throw new UnsupportedOperationException("increment 2: LtlValues.date()");']);
stub(L + 'LtlValues.java', 'static String time(String s) {', [
  '        // TODO 5 (checkpoints 5 and 6): "13:45:56:000" -> "13:45:56.000". ASE puts a colon before the milliseconds.',
  '        //   Replace the character at index 8 when it is a colon and the text is at least 9 characters long.',
  '        throw new UnsupportedOperationException("increment 2: LtlValues.time()");']);

// --- LtlParser: three methods ---
stub(L + 'LtlParser.java', 'private List<LtlCommand> commands() {', [
  '        // TODO 6 (parser checkpoints 1 to 7): the message is a sequence of "distribute" commands.',
  '        //   - an empty token list gives an empty result;',
  '        //   - if the first token is not the bare word "distribute", throw IllegalArgumentException;',
  '        //   - then, until the tokens run out: remember the position (t.get(p).pos()) of the "distribute" word, skip it,',
  '        //     and add command(start) to the result.',
  '        throw new UnsupportedOperationException("increment 2: LtlParser.commands()");']);
stub(L + 'LtlParser.java', 'private LtlCommand command(int start) {', [
  '        // TODO 7 (parser checkpoints 1 to 7): parse ONE command. The grammar is in the class comment above.',
  '        //   1. Tags: while the next token is a number followed by a value: "1" = origin time (a date-time value),',
  '        //      "4" = origin queue id (0x... hex), "6" = transaction id (0x... hex); skip a "," between tags.',
  '        //   2. The kind, by the next bare word:',
  '        //      begin    -> BEGIN: optional "system", optional "transaction", optional transaction name (a VALUE),',
  '        //                  then optional "for" or "npw" followed by the user name (a VALUE);',
  '        //      commit   -> COMMIT;   rollback -> ROLLBACK;',
  '        //      applied  -> optional "owner" "=" <owner>, then <table> "." <function>; rs_insert / rs_update / rs_delete give',
  '        //                  INSERT / UPDATE / DELETE, anything else OTHER. For a row change, after "yielding" read one',
  '        //                  or two images ("before" and/or "after"), each with params(keys).',
  '        //      for an UPDATE the after image only carries the changed columns: merge it over the before image so that',
  '        //      `after` is the full new row (same column order as before).',
  '        //      anything else -> OTHER.',
  '        //   3. Skip tokens up to the next "distribute"; the raw text of this command is msg[start .. position of the',
  '        //      next "distribute" (or the end)] as a stripped String.',
  '        //   4. Return new LtlCommand(kind, originTime, oqid, tranId, owner, table, before, after, List.copyOf(keys), tranName, user, raw).',
  '        throw new UnsupportedOperationException("increment 2: LtlParser.command()");']);
stub(L + 'LtlParser.java', 'private Map<String, Object> params(List<String> keys) {', [
  '        // TODO 8 (parser checkpoints 1, 2, 5, 6): read "name = value, name = value ..." into a LinkedHashMap (keep the order).',
  '        //   A name is a NAME token. If its marker is \'G\' the column is part of the primary key: add it to `keys` once.',
  '        //   After each name: expect "=", convert the next token with LtlValues.convert(next(), cs), skip an optional ",".',
  '        throw new UnsupportedOperationException("increment 2: LtlParser.params()");']);

let pom = fs.readFileSync(path.join(OUT, 'pom.xml'), 'utf8');
pom = pom.replace('Reference solution of increment 2. The tests are shared with the starter (lab/increments/02-ltl-parser/tests).',
                  'Starter of increment 2: your working copy. The tests are in lab/increments/02-ltl-parser/tests.')
         .split('../../increments/02-ltl-parser/tests').join('../tests');
fs.writeFileSync(path.join(OUT, 'pom.xml'), pom);
console.log('starter written');
