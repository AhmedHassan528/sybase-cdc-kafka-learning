// Build-along guide pages: lab/increments/README.md and the six step READMEs become pages in the same design.
// The README text is not changed (FR-013): marked renders it, and only links, heading ids and table wrappers are added.
// Page convention (shared with docs-src/site-checks/common.js): README.md -> guide/index.html, NN-name/README.md -> guide/NN-name.html
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const { esc, text, excerpt } = require('./util');
const { contents, prevNext } = require('./templates/article');
const { load } = require('./code-map');

exports.build = function ({ ROOT, OUT, cfg, problem }) {
  const inc = path.join(ROOT, 'lab', 'increments');
  const sources = [{ file: path.join(inc, 'README.md'), src: 'lab/increments/README.md', page: 'guide/index.html', step: '' }];
  fs.readdirSync(inc).filter(n => /^\d\d-/.test(n)).sort().forEach(d => {
    const f = path.join(inc, d, 'README.md');
    if (fs.existsSync(f)) sources.push({ file: f, src: `lab/increments/${d}/README.md`, page: `guide/${d}.html`, step: String(Number(d.slice(0, 2))) });
  });
  const codeSteps = load(ROOT).steps;
  const pageOf = new Map(sources.map(s => [path.normalize(s.file), s.page]));
  const guideDir = path.join(OUT, 'guide');
  const rel = p => p.split(path.sep).join('/');

  // Build the pages in two passes: first titles (for previous/next), then bodies.
  const titles = sources.map(s => {
    const m = fs.readFileSync(s.file, 'utf8').match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : s.src;
  });

  // Links to the Java code of this increment, added after the README text (the README itself is not changed).
  const codeBox = s => {
    const st = codeSteps.find(x => String(x.number) === s.step);
    if (!st) return s.step ? '' : `<aside class="note code-link"><p><strong>Code:</strong> <a href="../code/index.html">the Java source of the connector and the pom.xml that builds the JAR</a>.</p></aside>`;
    const list = key => st.files.map(f => `<a href="../${f[key]}">${esc(f.cls)}.java</a>`).join(' · ');
    return `<aside class="note code-link"><p><strong>Code for this increment.</strong> Starter (you write): ${list('starterPage')}. Reference solution: ${list('solutionPage')}. <a href="../code/index.html">All connector files</a>.</p></aside>`;
  };

  const pages = [], entries = [];
  sources.forEach((s, i) => {
    const slugs = new Map();
    const items = [], heads = [];
    const marked = new Marked({
      renderer: {
        heading(t, level, raw) {
          let slug = raw.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'section';
          const n = slugs.get(slug) || 0; slugs.set(slug, n + 1);
          if (n) slug += '-' + n;
          heads.push({ level, id: slug, text: text(t) });
          if (level === 2 || level === 3) items.push({ lvl: level, id: slug, text: text(t), n: '' });
          return `<h${level} id="${slug}">${t}</h${level}>\n`;
        },
        table(header, body) { return `<div class="tbl"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`; },
        link(href, title, t) {
          let out = href;
          if (href && !/^(https?:|mailto:|#)/.test(href)) {
            const [f, frag] = href.split('#');
            const abs = path.normalize(path.resolve(path.dirname(s.file), f));
            if (pageOf.has(abs)) out = path.posix.relative('guide', pageOf.get(abs)) + (frag ? '#' + frag : '');
            else if (fs.existsSync(abs)) out = rel(path.relative(guideDir, abs)) + (frag ? '#' + frag : '');
            else problem(`${s.src}: link target not found: ${href}`);
          }
          return `<a href="${esc(out)}"${title ? ` title="${esc(title)}"` : ''}>${t}</a>`;
        },
      },
    });
    const html = marked.parse(fs.readFileSync(s.file, 'utf8'));
    const firstPara = (html.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || '';
    const minutes = Math.max(1, Math.ceil(text(html).split(' ').length / 200));
    heads.forEach((h, k) => {
      entries.push({ page: s.page, anchor: h.id, heading: h.text, section: s.step, text: excerpt(text(firstPara), 300), keywords: 'build-along guide step' });
    });

    const prev = i > 0 ? { href: path.posix.relative('guide', sources[i - 1].page), label: titles[i - 1] } : null;
    const next = i < sources.length - 1 ? { href: path.posix.relative('guide', sources[i + 1].page), label: titles[i + 1] } : null;
    const label = s.step ? `Build-along · Increment ${s.step}` : 'Build-along';
    const body = `<div class="page-grid">
<header class="title-block guide-head"><p class="category">${esc(label)} <span class="cat-meta">· ${minutes} min read</span></p></header>
${contents(items)}
<article class="prose-site guide-body" id="article">
<!--src:${s.src}-->${html}<!--/src-->
${codeBox(s)}
${prevNext(prev, next)}
</article>
</div>`;
    pages.push({ path: s.page, current: 'guide', title: `${titles[i]} | ${cfg.name}`, description: excerpt(text(firstPara), 200), body });
  });
  return { pages, entries };
};
