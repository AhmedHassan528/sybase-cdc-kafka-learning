// Builds docs/index.html from docs-src/chapters/*.html (in file-name order).
//   node docs-src/build.js            -> docs/index.html (engineering handbook, from docs-src/chapters)
//   node docs-src/build.js article    -> docs/article.html (learning article, from docs-src/article)
// - <h2 id="..."> become numbered chapters; <h2>/<h3> with ids form the table of contents.
// - <figure-diagram src="NN-name" n="NN" title="..."> ...explanation... </figure-diagram>
//     embeds docs/diagrams/src/svg/NN-name.svg and links the editable .drawio source.
// - <line-chart spec='{...json...}'></line-chart> renders an SVG chart at build time.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODE = process.argv[2] === 'article' ? 'article' : 'handbook';
const CH = path.join(__dirname, MODE === 'article' ? 'article' : 'chapters');
const OUT = path.join(ROOT, 'docs', MODE === 'article' ? 'article.html' : 'index.html');
const META = MODE === 'article'
  ? { title: 'Building a Sybase ASE to Kafka CDC Connector', desc: 'A hands-on deep dive: run a change data capture pipeline from Sybase ASE to Kafka, then build the connector step by step.', brand: 'Sybase ASE → Kafka CDC<small>Hands-on deep dive</small>' }
  : { title: 'Sybase CDC Handbook', desc: 'Knowledge transfer for the custom Sybase ASE RepAgent to Kafka Connect CDC connector: architecture, protocol, code, build, tests, deployment and operations.', brand: 'Sybase ASE → Kafka CDC<small>Engineering handbook · connector 0.1.0</small>' };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

let html = fs.readdirSync(CH).filter(f => f.endsWith('.html')).sort()
  .map(f => `\n<!-- ${f} -->\n` + fs.readFileSync(path.join(CH, f), 'utf8')).join('\n');

// Diagrams
html = html.replace(/<figure-diagram\s+src="([^"]+)"\s+n="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/figure-diagram>/g, (m, src, n, title, body) => {
  const svg = `diagrams/src/svg/${src}.svg`;
  if (!fs.existsSync(path.join(ROOT, 'docs', svg))) throw new Error('missing diagram ' + svg);
  return `<figure class="diagram" id="fig-${n}">
<div class="img"><a href="${svg}" title="Open full size"><img src="${svg}" alt="${esc(title)}" loading="lazy"></a></div>
<figcaption><span class="fig-title">Figure ${Number(n)}. ${title}</span> · <a href="diagrams/src/${src}.drawio">editable draw.io source</a> · <a href="${svg}">full size</a>
${body}</figcaption></figure>`;
});

// Charts: spec = {w,h,x:[min,max,ticks[]],xl,y:[min,max,ticks[]],yl,fy,series:[{c:'s1',pts:[[x,y]],step}],bands:[[x0,x1]],thr:[y]}
html = html.replace(/<line-chart\s+spec='([^']+)'\s*><\/line-chart>/g, (m, json) => {
  const s = JSON.parse(json);
  const W = s.w || 560, H = s.h || 260, L = 56, R = 16, T = 12, B = 40;
  const pw = W - L - R, ph = H - T - B;
  const sx = x => L + (x - s.x[0]) / (s.x[1] - s.x[0]) * pw;
  const sy = y => T + ph - (y - s.y[0]) / (s.y[1] - s.y[0]) * ph;
  const fy = v => (s.fy || '{v}').replace('{v}', v);
  let o = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.label || '')}">`;
  for (const b of s.bands || []) o += `<rect class="band" x="${sx(b[0])}" y="${T}" width="${sx(b[1]) - sx(b[0])}" height="${ph}"/>`;
  for (const v of s.y[2]) o += `<line class="grid" x1="${L}" x2="${L + pw}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${fy(v)}</text>`;
  for (const v of s.x[2]) o += `<text x="${sx(v)}" y="${T + ph + 16}" text-anchor="middle">${v}${s.xu || ''}</text>`;
  o += `<text x="${L + pw / 2}" y="${H - 4}" text-anchor="middle">${esc(s.xl || '')}</text>`;
  for (const t of s.thr || []) o += `<line class="thr" x1="${L}" x2="${L + pw}" y1="${sy(t)}" y2="${sy(t)}"/>`;
  for (const ser of s.series) {
    let d = '';
    ser.pts.forEach((p, i) => { d += i === 0 ? `M${sx(p[0])} ${sy(p[1])}` : ser.step ? `H${sx(p[0])}V${sy(p[1])}` : `L${sx(p[0])} ${sy(p[1])}`; });
    o += `<path class="${ser.c}" d="${d}"/>`;
    const last = ser.pts[ser.pts.length - 1];
    o += `<circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="3.5" style="fill:var(--${ser.c === 's1' ? 'accent' : 'warn'})"/>`;
  }
  return o + '</svg>';
});

// Chapter numbering and table of contents
let chapter = 0;
const toc = [];
html = html.replace(/<h([23])\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g, (m, lvl, id, attrs, inner) => {
  if (lvl === '2') {
    chapter++;
    toc.push({ lvl: 2, id, text: strip(inner), n: chapter, kw: (attrs.match(/data-keywords="([^"]*)"/) || [])[1] || '' });
    return `<h2 id="${id}"${attrs}><span class="chno">${chapter}.</span>${inner}</h2>`;
  }
  toc.push({ lvl: 3, id, text: strip(inner), kw: (attrs.match(/data-keywords="([^"]*)"/) || [])[1] || '' });
  return m;
});
const tocHtml = '<ul class="toc">' + toc.map(t => t.lvl === 2
  ? `<li data-keywords="${esc(t.kw)}"><a href="#${t.id}"><span class="num">${t.n}</span>${esc(t.text)}</a></li>`
  : `<li class="sub" data-keywords="${esc(t.kw)}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('\n') + '</ul>';

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${META.title}</title>
<meta name="description" content="${META.desc}">
<link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
<details class="mobile-toc"><summary>Contents</summary><input type="search" placeholder="Filter chapters…" data-toc-filter aria-label="Filter chapters">${tocHtml}</details>
<div class="layout">
<nav class="sidebar" aria-label="Table of contents">
<div class="brand">${META.brand}</div>
<input type="search" placeholder="Filter chapters… (e.g. offset, 4047)" data-toc-filter aria-label="Filter chapters">
${tocHtml}
</nav>
<main>
${html}
</main>
</div>
<script src="assets/js/docs.js"></script>
</body>
</html>
`;
// Windows can report a transient "UNKNOWN" error while another program (a viewer, a scanner) holds the file: retry a few times.
for (let attempt = 1; ; attempt++) {
  try { fs.writeFileSync(OUT, page); break; }
  catch (e) { if (attempt >= 5) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000); }
}
console.log(`${path.relative(ROOT, OUT)}: ${chapter} chapters, ${toc.length} TOC entries, ${(page.length / 1024).toFixed(0)} KB`);
