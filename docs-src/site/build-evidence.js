// Evidence index: one page that lists every captured evidence file and links to the plain text file.
// The evidence files themselves are not restyled or copied (they stay in docs/evidence/).
const fs = require('fs');
const path = require('path');
const { esc } = require('./util');
const { contents } = require('./templates/article');

exports.build = function ({ ROOT, OUT, cfg }) {
  const dir = path.join(ROOT, 'docs', 'evidence');
  const kb = f => Math.max(1, Math.round(fs.statSync(f).size / 1024)) + ' KB';
  const titleOf = name => name.replace(/\.[^.]+$/, '').replace(/^\d+[a-z]?-/, '').replace(/[-_]+/g, ' ');
  const idOf = name => 'ev-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const top = fs.readdirSync(dir, { withFileTypes: true });
  const files = top.filter(e => e.isFile()).map(e => e.name).sort();
  // reference-* screenshots of the third-party page stay local (git-ignored) and are never listed.
  const keep = name => !path.posix.basename(name).startsWith('reference-');
  const folders = top.filter(e => e.isDirectory()).map(e => e.name).sort();
  const href = p => '../../evidence/' + p.split(path.sep).join('/');

  const entries = [], items = [];
  const rows = (list, sub) => list.map(name => {
    const base = path.posix.basename(name), rel = sub ? `${sub}/${name}` : name, num = (base.match(/^(\d+[a-z]?)-/) || [])[1] || '';
    const id = idOf(rel);
    entries.push({ page: 'evidence/index.html', anchor: id, heading: titleOf(base) + (num ? ` (evidence ${num})` : ''), section: '', text: `Evidence file ${rel}`, keywords: 'evidence captured output ' + rel });
    return `<tr id="${id}"><td>${esc(num)}</td><td>${esc(titleOf(base))}</td><td><a href="${esc(href(rel))}">${esc(rel)}</a></td><td>${kb(path.join(dir, rel))}</td></tr>`;
  }).join('\n');
  const table = r => `<div class="tbl"><table class="evidence-table"><thead><tr><th>No.</th><th>What it shows</th><th>File</th><th>Size</th></tr></thead><tbody>\n${r}\n</tbody></table></div>`;

  let n = 0, sections = '';
  items.push({ lvl: 2, id: 'ev-numbered', text: 'Numbered evidence files', n: ++n });
  sections += `<h2 id="ev-numbered">Numbered evidence files</h2>\n<p>These are the captured outputs the article cites. Files captured with the lab's capture script start with the date, the command and the container image versions; others, such as 01 to 13, are plain command output.</p>\n${table(rows(files))}\n`;
  // Files of a folder, including those in nested folders (paths relative to the folder).
  const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name), base ? `${base}/${e.name}` : e.name) : [base ? `${base}/${e.name}` : e.name]);
  let total = files.length;
  for (const f of folders) {
    const list = walk(path.join(dir, f)).filter(keep);
    if (!list.length) continue;
    total += list.length;
    items.push({ lvl: 2, id: 'ev-dir-' + f, text: `Folder ${f}/`, n: ++n });
    sections += `<h2 id="ev-dir-${f}">Folder <code>${esc(f)}/</code></h2>\n${table(rows(list, f))}\n`;
  }
  const body = `<div class="page-grid">
<header class="title-block"><p class="category">Evidence</p><h1>Evidence index</h1>
<p class="lede">Every captured output behind the article, ${total} files. The files open as plain text.</p>
<p class="meta">Anything the article labels "not run" has no file here.</p></header>
${contents(items)}
<article class="prose-site guide-body" id="article">
${sections}
</article>
</div>`;
  return { pages: [{ path: 'evidence/index.html', current: 'evidence', title: `Evidence index | ${cfg.name}`, description: `The ${total} captured evidence files behind the article.`, body }], entries };
};
