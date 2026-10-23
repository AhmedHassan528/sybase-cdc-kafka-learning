// Check (FR-013, SC-006): the BODY text of every article section and guide page in docs/site equals its source text.
// Excluded on purpose: title block, header, contents, previous/next links, script-added buttons, section numbers,
// and the figure caption wrapper (figures are compared by count). Code blocks (<pre>) are compared exactly.
const { fs, path, ROOT, SITE, decode, squash, text, between, guideMap } = require('./common');
let diffs = 0;
const fail = m => { console.log('DIFF', m); diffs++; };
const marked = (() => { try { return require('marked').marked; } catch (e) { return null; } })();

console.log('text-compare: body text of docs/site pages against their sources');
const idx = path.join(SITE, 'index.html');
if (!fs.existsSync(idx)) { console.log('FAIL docs/site/index.html does not exist (run: node docs-src/build.js site)'); process.exit(1); }
const built = fs.readFileSync(idx, 'utf8');

const prep = html => html
  .replace(/<figure-diagram[\s\S]*?<\/figure-diagram>/g, '')
  .replace(/<figure class="diagram"[\s\S]*?<\/figure>/g, '')
  .replace(/<span class="chno">[^<]*<\/span>/g, '');
const pres = html => [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)].map(m => decode(m[1].replace(/<[^>]+>/g, '')));
const count = (html, re) => (html.match(re) || []).length;

function compare(label, srcHtml, builtHtml) {
  const a = text(prep(srcHtml)), b = text(prep(builtHtml));
  if (a !== b) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    fail(`${label}: text differs at character ${i}: source "${a.slice(Math.max(0, i - 30), i + 40)}" built "${b.slice(Math.max(0, i - 30), i + 40)}"`);
  }
  const pa = pres(srcHtml), pb = pres(builtHtml);
  if (pa.length !== pb.length) fail(`${label}: ${pa.length} code blocks in source, ${pb.length} in built`);
  else pa.forEach((c, i) => { if (c !== pb[i]) fail(`${label}: code block ${i + 1} differs`); });
}

// Article sections.
const artDir = path.join(ROOT, 'docs-src', 'article');
let sections = 0, figs = 0, codeBlocks = 0;
for (const f of fs.readdirSync(artDir).filter(n => n.endsWith('.html')).sort()) {
  const src = fs.readFileSync(path.join(artDir, f), 'utf8');
  const body = between(built, f);
  if (body === null) { fail(`${f}: no body marker in docs/site/index.html`); continue; }
  compare(f, src, body); sections++;
  codeBlocks += pres(src).length;
  const fa = count(src, /<figure-diagram/g), fb = count(body, /<figure class="diagram"/g);
  if (fa !== fb) fail(`${f}: ${fa} figures in source, ${fb} in built`);
  figs += fb;
}
// Guide pages.
let guides = 0;
for (const g of guideMap()) {
  const p = path.join(SITE, g.page);
  if (!fs.existsSync(p)) { console.log(`skip ${g.page}: not built yet`); continue; }
  if (!marked) { fail('marked is not installed (npm ci --prefix docs-src)'); break; }
  const body = between(fs.readFileSync(p, 'utf8'), g.src);
  if (body === null) { fail(`${g.page}: no body marker`); continue; }
  compare(g.page, marked.parse(fs.readFileSync(path.join(ROOT, g.src), 'utf8')), body); guides++;
}
// Code pages: the <pre> must equal the source file exactly (every character, every line).
let codePages = 0, codeLines = 0;
{
  const map = require('../site/code-map').load(ROOT);
  const all = [...map.final, map.pom, ...map.steps.flatMap(s => s.files.flatMap(f => [{ page: f.starterPage, src: f.starterSrc }, { page: f.solutionPage, src: f.solutionSrc }]))];
  for (const c of all) {
    const p = path.join(SITE, c.page);
    if (!fs.existsSync(p)) { fail(`${c.page}: not built`); continue; }
    const body = between(fs.readFileSync(p, 'utf8'), c.src);
    if (body === null) { fail(`${c.page}: no body marker`); continue; }
    const [code] = pres(body);
    const want = fs.readFileSync(path.join(ROOT, c.src), 'utf8');
    if (code !== want) fail(`${c.page}: code differs from ${c.src} (${code.length} vs ${want.length} characters)`);
    codePages++; codeLines += want.split('\n').length;
  }
}
console.log(`code pages compared exactly with their source files: ${codePages} (${codeLines} lines)`);
console.log(`compared ${sections} article sections (${figs} figures, ${codeBlocks} code blocks compared exactly) and ${guides} guide pages; differences: ${diffs}`);
process.exit(diffs ? 1 : 0);
