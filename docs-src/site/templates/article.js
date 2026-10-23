// Article page body: title block, side contents, sections with previous/next.
const { esc } = require('../util');

function contentsList(items, extraClass = '') {
  return `<ul class="contents-list ${extraClass}">` + items.map(i =>
    i.lvl === 2
      ? `<li class="lvl2"><a href="#${i.id}">${i.n ? `<span class="num">${i.n}</span>` : ""}${esc(i.text)}</a></li>`
      : `<li class="lvl3"><a href="#${i.id}">${esc(i.text)}</a></li>`).join('') + '</ul>';
}

// Side contents on wide windows (always open) and an openable menu on narrow ones. Plain links: works without script.
function contents(items) {
  return `<aside class="contents-side" aria-label="Contents">
<nav class="contents-wide" aria-label="Contents"><p class="contents-title">Contents</p>
${contentsList(items)}
</nav>
<details class="contents-menu" id="ui-contents"><summary>Contents</summary>
${contentsList(items)}
</details></aside>`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
}

// Headline first, then a crumb line with the date and read time, then the one-sentence summary.
function titleBlock(cfg, minutes) {
  return `<header class="title-block">
<h1>${esc(cfg.title)}</h1>
<div class="meta-row">
<p class="crumbs"><span>${esc(cfg.category)}</span><span aria-hidden="true">›</span><span>${esc(cfg.topic)}</span></p>
<p class="meta"><time datetime="${esc(cfg.date)}">${shortDate(cfg.date)}</time><span class="rt">Read time: ${minutes} min</span></p>
</div>
<p class="lede">${esc(cfg.summary)}</p>
</header>`;
}

// prev/next: { href, label } or null
function prevNext(prev, next) {
  const a = prev ? `<a class="pn-prev" rel="prev" href="${prev.href}"><span class="pn-dir">Previous</span><span class="pn-title">${esc(prev.label)}</span></a>` : '<span></span>';
  const b = next ? `<a class="pn-next" rel="next" href="${next.href}"><span class="pn-dir">Next</span><span class="pn-title">${esc(next.label)}</span></a>` : '<span></span>';
  return `<nav class="pn" aria-label="Section navigation">${a}${b}</nav>`;
}

// sections: [{ file, html, h2id, title, n }]
function articleBody(cfg, minutes, items, sections) {
  const secs = sections.map((s, i) => {
    const prev = i > 0 ? { href: '#' + sections[i - 1].h2id, label: sections[i - 1].n + '. ' + sections[i - 1].title } : null;
    const next = i < sections.length - 1 ? { href: '#' + sections[i + 1].h2id, label: sections[i + 1].n + '. ' + sections[i + 1].title } : null;
    return `<!--src:${s.file}-->${s.html}<!--/src-->\n${prevNext(prev, next)}`;
  }).join('\n');
  return `<div class="page-grid">
${titleBlock(cfg, minutes)}
${contents(items)}
<article class="prose-site article" id="article">
${secs}
</article>
</div>`;
}

module.exports = { articleBody, contents, contentsList, titleBlock, prevNext };
