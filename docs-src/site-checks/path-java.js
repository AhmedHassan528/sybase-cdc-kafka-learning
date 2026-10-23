// Check (SC-004, FR-011, FR-012): the Java lessons. For each file of sybase-cdc-connector/ and its pom.xml:
//   - the code on the page equals the file exactly (text content of the code block);
//   - every class and method of the file (from lab/path/java-members.json, made by javap) has a note, and no note names something
//     that does not exist; every note can be placed on a line of the file;
//   - env: names exist in lab/path/env-values.json and list this file in usedBy;
//   - the "fits" text names only classes it really uses or is used by.
const { fs, path, ROOT, SITE, decode } = require('./common');
const J = require('../site/path-lib/java');
let problems = 0, pages = 0, notes = 0, members = 0, lines = 0;
const bad = (id, msg) => { problems++; console.log(`FAIL ${id}: ${msg}`); };

console.log('path-java: Java lessons, exact code, a note for every class and method');
const mf = path.join(ROOT, 'lab', 'path', 'java-members.json');
if (!fs.existsSync(mf)) { bad('java-members.json', 'missing: run bash lab/path/list-java-members.sh'); console.log(`problems: ${problems}`); process.exit(1); }
const list = JSON.parse(fs.readFileSync(mf, 'utf8')).classes;
const envFile = path.join(ROOT, 'lab', 'path', 'env-values.json');
const env = fs.existsSync(envFile) ? JSON.parse(fs.readFileSync(envFile, 'utf8')) : [];
const files = J.allFiles();
const names = new Set(files.map(f => f.cls));

for (const f of files) {
  const id = `${f.id} ${f.cls}`;
  const n = J.readNotes(f.cls);
  if (!n) { bad(id, `no note file docs-src/path/java-notes/${f.cls}.md`); continue; }
  const src = f.text.split('\n');
  const entries = n.entries;
  for (const kind of ['purpose', 'fits']) if (!entries.some(e => e.kind === kind && e.text)) bad(id, `no ${kind} entry`);

  if (!f.isPom) {
    // javap members of this file's classes (the top-level class and its nested classes)
    const mine = Object.entries(list).filter(([, c]) => c.source === f.rel);
    if (!mine.length) bad(id, 'javap lists no class for this file');
    const haveClass = new Set(entries.filter(e => e.kind === 'class').map(e => e.arg));
    const haveMethod = new Set(entries.filter(e => e.kind === 'method').map(e => e.arg));
    const wantClass = new Set(), wantMethod = new Set();
    for (const [full, c] of mine) {
      const short = full.split('.').slice(-1)[0];
      const nested = full.slice(full.indexOf(f.cls));              // Outer.Inner
      wantClass.add(nested);
      for (const m of c.members) wantMethod.add(`${nested}.${m}`);
    }
    members += wantMethod.size;
    for (const c of wantClass) if (!haveClass.has(c)) bad(id, `no "class: ${c}" note`);
    for (const m of wantMethod) if (!haveMethod.has(m)) bad(id, `no "method: ${m}" note`);
    for (const c of haveClass) if (!wantClass.has(c)) bad(id, `the note "class: ${c}" names a class the file does not have`);
    for (const m of haveMethod) if (!wantMethod.has(m)) bad(id, `the note "method: ${m}" names a method the file does not have`);
    for (const e of entries.filter(e => e.kind === 'class')) if (!J.lineOfClass(src, e.arg)) bad(id, `cannot place "class: ${e.arg}" on a line`);
    for (const e of entries.filter(e => e.kind === 'method')) { const mm = e.arg.match(/^([\w$.]+)\.(.+)$/); if (!mm || !J.lineOfMember(src, mm[1], mm[2])) bad(id, `cannot place "method: ${e.arg}" on a line`); }
    for (const e of entries.filter(e => e.kind === 'method' || e.kind === 'class')) if (!e.text) bad(id, `the note "${e.kind}: ${e.arg}" has no text`);
  } else if (!entries.some(e => e.kind === 'lines')) bad(id, 'the pom.xml notes need "lines:" entries (every dependency and plugin)');
  notes += entries.filter(e => ['class', 'method', 'lines'].includes(e.kind)).length;
  for (const e of entries.filter(e => e.kind === 'lines')) {
    const m = e.arg.match(/^(\d+)(?:-(\d+))?$/);
    if (!m || Number(m[1]) < 1 || Number(m[2] || m[1]) > src.length || Number(m[2] || m[1]) < Number(m[1])) bad(id, `"lines: ${e.arg}" is outside the file (${src.length} lines)`);
  }
  for (const e of entries.filter(e => e.kind === 'env')) {
    const v = env.find(x => x.name === e.arg);
    if (!v) bad(id, `"env: ${e.arg}" is not in lab/path/env-values.json`);
    else if (!(v.usedBy || []).includes(f.rel)) bad(id, `"env: ${e.arg}": usedBy in env-values.json does not list ${f.rel}`);
  }
  const fits = (entries.find(e => e.kind === 'fits') || {}).text || '';
  for (const tok of fits.match(/\b[A-Z][A-Za-z0-9]+\b/g) || []) if (names.has(tok) && tok !== f.cls && !f.uses.includes(tok) && !f.usedBy.includes(tok)) bad(id, `the fits text names ${tok}, which neither uses nor is used by ${f.cls}`);

  // The page: the code block text equals the file.
  const page = path.join(SITE, 'path', 'java', f.slug + '.html');
  if (!fs.existsSync(page)) { bad(id, `page not built: path/java/${f.slug}.html`); continue; }
  const html = fs.readFileSync(page, 'utf8');
  const m = html.match(/<pre data-lang="[a-z]+" class="code-lines" data-file="([^"]+)"><code>([\s\S]*?)<\/code><\/pre>/);
  if (!m) { bad(id, 'no code block on the page'); continue; }
  const code = decode(m[2].replace(/<[^>]+>/g, ''));
  if (m[1] !== f.rel) bad(id, `the code block is for ${m[1]}, expected ${f.rel}`);
  if (code !== f.text) { let i = 0; while (i < code.length && code[i] === f.text[i]) i++; bad(id, `the code differs from the file at character ${i}`); }
  pages++; lines += src.length;
}
console.log(`Java lessons compared with their files: ${pages} (${lines} lines); notes: ${notes}; members that need a note: ${members}; problems: ${problems}`);
process.exit(problems ? 1 : 0);
