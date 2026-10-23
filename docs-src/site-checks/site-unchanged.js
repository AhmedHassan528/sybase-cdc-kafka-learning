// Check (FR-001, SC-008): the body text of every page that existed before the learning path is unchanged.
//   node docs-src/site-checks/site-unchanged.js --record   writes the baseline (do this BEFORE changing the site)
//   node docs-src/site-checks/site-unchanged.js            compares the current docs/site with the baseline
// What is hashed, per page: the text between each <!--src:...--> body marker (article sections, guide pages, code pages);
// for pages without markers, the text of the <article> element with previous/next navigation removed; for the evidence
// index only the table rows that existed at record time. Excluded: header and navigation (they gain one entry), the side
// contents list, the footer, and the evidence index file-count sentence and any new rows or sections.
const crypto = require('crypto');
const { fs, path, ROOT, SITE, text, pages } = require('./common');
const BASE = path.join(ROOT, 'specs', '003-end-to-end-learning-path', 'baseline', 'site-body-text.json');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

function markers(html) {
  const out = {};
  const re = /<!--src:([^>]*?)-->([\s\S]*?)<!--\/src-->/g;
  let m;
  while ((m = re.exec(html))) out[m[1]] = hash(text(m[2]));
  return out;
}
function articleText(html) {
  const a = html.indexOf('<article');
  const b = html.indexOf('</article>');
  if (a < 0 || b < 0) return null;
  let body = html.slice(a, b);
  body = body.replace(/<nav class="pn"[\s\S]*?<\/nav>/g, '');
  return hash(text(body));
}
function evidenceRows(html) {
  const rows = {};
  const re = /<tr id="(ev-[^"]+)">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(html))) rows[m[1]] = hash(text(m[2]));
  return rows;
}
function snapshot() {
  const snap = {};
  for (const rel of pages()) {
    if (rel.startsWith('path/')) continue;           // new pages of the learning path are not part of the baseline
    const html = fs.readFileSync(path.join(SITE, rel), 'utf8');
    if (rel === 'evidence/index.html') { snap[rel] = { rows: evidenceRows(html) }; continue; }
    const mk = markers(html);
    if (Object.keys(mk).length) snap[rel] = { markers: mk };
    else { const a = articleText(html); if (a) snap[rel] = { article: a }; }
  }
  return snap;
}

if (process.argv.includes('--record')) {
  const snap = snapshot();
  fs.mkdirSync(path.dirname(BASE), { recursive: true });
  fs.writeFileSync(BASE, JSON.stringify(snap, null, 1) + '\n');
  const pagesN = Object.keys(snap).length;
  const items = Object.values(snap).reduce((n, v) => n + Object.keys(v.markers || v.rows || { a: 1 }).length, 0);
  console.log(`site-unchanged: baseline recorded for ${pagesN} pages (${items} hashed parts) in ${path.relative(ROOT, BASE)}`);
  process.exit(0);
}

console.log('site-unchanged: body text of the pages that existed before the learning path');
if (!fs.existsSync(BASE)) { console.log('FAIL no baseline: run with --record before changing the site'); process.exit(1); }
const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const now = snapshot();
let diffs = 0, parts = 0;
const diff = m => { diffs++; console.log('DIFF ' + m); };
for (const [rel, b] of Object.entries(base)) {
  const n = now[rel];
  if (!n) { diff(`${rel}: page no longer exists`); continue; }
  if (b.markers) {
    for (const [k, h] of Object.entries(b.markers)) { parts++; if (n.markers?.[k] !== h) diff(`${rel}: body of ${k} changed`); }
  } else if (b.rows) {
    for (const [k, h] of Object.entries(b.rows)) { parts++; if (n.rows?.[k] !== h) diff(`${rel}: row ${k} ${n.rows?.[k] ? 'changed' : 'missing'}`); }
  } else { parts++; if (n.article !== b.article) diff(`${rel}: article text changed`); }
}
console.log(`compared ${Object.keys(base).length} pages, ${parts} hashed parts; differences: ${diffs}`);
process.exit(diffs ? 1 : 0);
