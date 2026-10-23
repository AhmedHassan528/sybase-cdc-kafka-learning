// Shared helpers for the website checks (no dependencies). Each check exits 0 on pass and 1 on fail.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SITE = path.join(ROOT, 'docs', 'site');
const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => entities[m]);
const squash = s => s.replace(/\s+/g, ' ').trim();
// Visible text of an HTML fragment: scripts and tags removed, entities decoded, whitespace squashed.
const text = html => squash(decode(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')));
// Everything between the build's body markers for one source: <!--src:NAME--> ... <!--/src-->
function between(html, name) {
  const start = '<!--src:' + name + '-->';
  const i = html.indexOf(start);
  if (i < 0) return null;
  const j = html.indexOf('<!--/src-->', i);
  return j < 0 ? null : html.slice(i + start.length, j);
}
// Walks docs/site and returns every .html page (relative posix paths).
function pages(dir = SITE, base = SITE) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? pages(path.join(dir, e.name), base)
      : e.name.endsWith('.html') ? [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')] : []);
}
// The build-along guide pages: README source -> page path (convention shared with build-site.js).
function guideMap() {
  const inc = path.join(ROOT, 'lab', 'increments');
  const map = [{ src: 'lab/increments/README.md', page: 'guide/index.html' }];
  for (const d of fs.readdirSync(inc).filter(n => /^\d\d-/.test(n)).sort())
    if (fs.existsSync(path.join(inc, d, 'README.md'))) map.push({ src: `lab/increments/${d}/README.md`, page: `guide/${d}.html` });
  return map;
}
module.exports = { fs, path, ROOT, SITE, decode, squash, text, between, pages, guideMap };
