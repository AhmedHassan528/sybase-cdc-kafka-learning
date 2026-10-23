// Builds the article website into docs/site/ (GENERATED: never edit by hand; change the sources and rebuild).
//   node docs-src/build.js site
// Sources: docs-src/article/*.html (article), lab/increments/**/README.md (build-along guide), docs/evidence (evidence index).
// Styles: Tailwind CLI compiles docs-src/site/styles/site.css into docs/site/assets/site.css at build time.
// Nothing is loaded from the internet at read time.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { esc, text, excerpt } = require('./util');
const { page } = require('./templates/shell');
const { articleBody } = require('./templates/article');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'site');
const SRC = path.join(ROOT, 'docs-src', 'article');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8'));
const problems = [];
const problem = m => problems.push(m);

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Windows can report a transient error while another program holds the file: retry a few times.
  for (let attempt = 1; ; attempt++) {
    try { fs.writeFileSync(file, content); return; }
    catch (e) { if (attempt >= 5) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); }
  }
}

// ---- Article ---------------------------------------------------------------------------------------------------
function figures(html) {
  return html.replace(/<figure-diagram\s+src="([^"]+)"\s+n="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/figure-diagram>/g, (m, src, n, title, body) => {
    const svg = `../diagrams/src/svg/${src}.svg`;
    if (!fs.existsSync(path.join(OUT, svg))) problem(`missing diagram ${svg}`);
    return `<figure class="diagram" id="fig-${n}">
<div class="img"><a href="${svg}" title="Open full size"><img src="${svg}" alt="${esc(title)}"></a></div>
<figcaption><span class="fig-title">Figure ${Number(n)}. ${title}</span> · <a href="../diagrams/src/${src}.drawio">editable draw.io source</a> · <a href="${svg}">full size</a>
${body}</figcaption></figure>`;
  });
}

// The site sits in docs/site, one level below the files the article links to (evidence, handbook).
function rewriteLinks(html) {
  return html.replace(/href="evidence\//g, 'href="../evidence/').replace(/href="index\.html/g, 'href="../index.html')
    // The article sources link to the code pages as site/code/... (valid from docs/ for the plain article build too).
    .replace(/href="site\/code\//g, 'href="code/')
    // Mark the "not run" labels so they can be styled as visible labels (presentation only: the text is unchanged).
    .replace(/<em>not run<\/em>/g, '<em class="notrun">not run</em>');
}

const HEADING = /<h([23])\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g;

function parseArticle() {
  const files = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).sort();
  if (!files.length) throw new Error('no article sources in ' + SRC);
  const sections = [], items = [], entries = [];
  let words = 0;
  files.forEach((file, i) => {
    let html = rewriteLinks(figures(fs.readFileSync(path.join(SRC, file), 'utf8')));
    const n = i + 1;
    const heads = [...html.matchAll(HEADING)].map(m => ({ lvl: Number(m[1]), id: m[2], attrs: m[3], title: text(m[4]), start: m.index, end: m.index + m[0].length }));
    const h2 = heads.find(h => h.lvl === 2);
    if (!h2) throw new Error(`${file}: no <h2 id>`);
    const kwOf = h => (h.attrs.match(/data-keywords="([^"]*)"/) || [])[1] || '';
    heads.forEach((h, k) => {
      const bodyText = text(html.slice(h.end, k + 1 < heads.length ? heads[k + 1].start : html.length));
      items.push(h.lvl === 2 ? { lvl: 2, id: h.id, text: h.title, n } : { lvl: 3, id: h.id, text: h.title });
      entries.push({ page: 'index.html', anchor: h.id, heading: h.title, section: String(n), text: excerpt(bodyText), keywords: kwOf(h) });
    });
    words += text(html).split(' ').length;
    html = html.replace(HEADING, (m, lvl, id, attrs, inner) => lvl === '2' ? `<h2 id="${id}"${attrs}><span class="chno">${n}.</span>${inner}</h2>` : m);
    sections.push({ file, html, h2id: h2.id, title: h2.title, n });
  });
  return { sections, items, entries, minutes: Math.max(1, Math.ceil(words / 200)) };
}

// ---- Build -----------------------------------------------------------------------------------------------------
function main() {
  fs.rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

  const art = parseArticle();
  const pages = [{
    path: 'index.html', current: 'article', title: cfg.title + ' | ' + cfg.name, description: cfg.summary,
    body: articleBody(cfg, art.minutes, art.items, art.sections),
  }];
  let entries = art.entries.slice();
  const extra = [];
  for (const name of ['build-guide', 'build-code', 'build-evidence']) {
    const file = path.join(__dirname, name + '.js');
    if (fs.existsSync(file)) extra.push(require(file).build({ ROOT, OUT, cfg, problem }));
  }
  for (const r of extra) { pages.push(...r.pages); entries = entries.concat(r.entries || []); }

  const depth = p => '../'.repeat(p.split('/').length - 1);
  for (const p of pages) write(p.path, page({ ...p, root: depth(p.path), siteName: cfg.name, searchIndex: entries }));
  write('assets/search-index.json', JSON.stringify(entries));
  fs.copyFileSync(path.join(__dirname, 'client', 'site.js'), path.join(OUT, 'assets', 'site.js'));

  // Duplicate ids on the article page would break anchors.
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) problem('duplicate ids on index.html: ' + dup.join(' '));

  // Nothing may come from the internet at read time (FR-011).
  for (const p of pages) {
    const h = fs.readFileSync(path.join(OUT, p.path), 'utf8');
    for (const m of h.matchAll(/<(?:script|img|link|iframe|source)\b[^>]*\s(?:src|href)="(https?:[^"]+)"/g))
      if (!/^<a\b/.test(m[0])) problem(`${p.path}: loads from the internet: ${m[1]}`);
  }

  // Tailwind compiles after the HTML exists, because it scans the generated pages for the classes in use.
  const cli = path.join(ROOT, 'docs-src', 'node_modules', 'tailwindcss', 'lib', 'cli.js');
  if (!fs.existsSync(cli)) throw new Error('Tailwind is not installed: run npm ci --prefix docs-src');
  cp.execFileSync(process.execPath, [cli, '-c', path.join(__dirname, 'tailwind.config.js'), '-i', path.join(__dirname, 'styles', 'site.css'),
    '-o', path.join(OUT, 'assets', 'site.css'), '--minify'], { stdio: ['ignore', 'pipe', 'pipe'] });

  if (problems.length) { console.log('site: build problems:\n  ' + problems.join('\n  ')); process.exit(1); }
  const guide = pages.filter(p => p.path.startsWith('guide/')).length;
  const ev = pages.filter(p => p.path.startsWith('evidence/')).length;
  const code = pages.filter(p => p.path.startsWith('code/')).length;
  console.log(`site: docs/site: ${art.sections.length} article sections, ${art.items.length} headings, ${guide} guide pages, ${code} code pages, ${ev} evidence index, ${entries.length} search entries, ${art.minutes} min read`);
}
main();
