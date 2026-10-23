// Check (SC-002, FR-004): every command shown in a lesson was run, and every output block on a built page equals the recorded
// evidence (after the masks of the step). Parts labelled "example, not run" are counted and not compared.
const { fs, path, SITE } = require('./common');
const D = require('../site/path-lib/data');
let problems = 0, shown = 0, compared = 0, notRun = 0;
const bad = (id, msg) => { problems++; console.log(`FAIL ${id}: ${msg}`); };
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

console.log('path-evidence: commands run for real, output blocks equal the recorded evidence');
const all = require('../site/path-lib/all').all();
if (!all.length) bad('lessons', 'no lessons found');

for (const L of all) {
  const id = String(L.meta.id);
  if (L.meta.example === true) { notRun++; continue; }
  const steps = D.stepsOf(id);
  const ev = D.evidenceOf(id);
  if (!steps) { bad(id, 'no steps file'); continue; }
  if (!ev) { bad(id, `no evidence file docs/evidence/path/${id}.txt (the commands were not run)`); continue; }
  const page = path.join(SITE, 'path', L.meta.stage, (L.pageSlug || D.slug(L.meta.title)) + '.html');
  const html = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : null;
  for (const s of steps.steps) {
    shown++;
    const rec = ev.steps[s.id];
    if (!rec) { bad(id, `step "${s.id}" has no recorded run`); continue; }
    if (rec.cmd !== s.run) bad(id, `step "${s.id}": the recorded command differs from the steps file`);
    const want = s.expectExit === undefined ? 0 : s.expectExit;
    if (rec.exit !== want) bad(id, `step "${s.id}": exit code ${rec.exit}, expected ${want}`);
    if (!html) { bad(id, `page not built: ${path.relative(SITE, page)}`); continue; }
    if (s.noOutput) continue;
    const m = html.match(new RegExp('<div class="step-out" data-lesson="' + id.replace('.', '\\.') + '" data-step="' + s.id + '"><pre>([\\s\\S]*?)</pre>'));
    if (!m) { bad(id, `step "${s.id}": no output block on the page`); continue; }
    compared++;
    const pageText = decode(m[1].replace(/<[^>]+>/g, ''));
    const expected = D.applyMasks(rec.output, s.mask);
    if (pageText.replace(/\s+$/, '') !== expected.replace(/\s+$/, '')) bad(id, `step "${s.id}": the output on the page differs from the evidence`);
  }
}
console.log(`commands shown: ${shown}; output blocks compared: ${compared}; parts labelled "example, not run": ${notRun}; problems: ${problems}`);
process.exit(problems ? 1 : 0);
