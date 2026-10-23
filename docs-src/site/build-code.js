// Code pages: the real Java source of the connector (reference solution of increment 6), the pom.xml that builds the JAR,
// and, per increment, the starter file you write and its reference solution. Files are copied at build time, never retyped.
const fs = require('fs');
const path = require('path');
const { esc } = require('./util');
const { load } = require('./code-map');
const { contents } = require('./templates/article');

exports.build = function ({ ROOT, cfg }) {
  const map = load(ROOT);
  const pages = [], entries = [];
  const rootOf = p => '../'.repeat(p.split('/').length - 1);
  const link = (from, to, text) => `<a href="${path.posix.relative(path.posix.dirname(from), to)}">${esc(text)}</a>`;

  // The side list of a file page: the other files of the same group, as plain links.
  function fileNav(from, group, title) {
    const li = group.map(g => `<li class="lvl2"><a href="${path.posix.relative(path.posix.dirname(from), g.page)}"${g.page === from ? ' aria-current="page"' : ''}>${esc(g.label)}</a></li>`).join('');
    const list = `<ul class="contents-list">${li}</ul>`;
    return `<aside class="contents-side" aria-label="${esc(title)}"><nav class="contents-wide" aria-label="${esc(title)}"><p class="contents-title">${esc(title)}</p>${list}</nav>` +
      `<details class="contents-menu"><summary>${esc(title)}</summary>${list}</details></aside>`;
  }

  function filePage({ page, src, label, kind, lang, intro, group, groupTitle, extraLinks }) {
    const text = fs.readFileSync(path.join(ROOT, src), 'utf8');
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    const body = `<div class="page-grid">
<header class="title-block code-head"><p class="category">${esc(kind)}</p><h1>${esc(label)}</h1><p class="meta-line"><code>${esc(src)}</code> · ${lines} lines</p></header>
${fileNav(page, group, groupTitle)}
<article class="prose-site guide-body" id="article">
<p>${intro}</p>
<!--src:${src}--><pre data-lang="${lang}"><code>${esc(text)}</code></pre><!--/src-->
${extraLinks ? `<p>${extraLinks}</p>` : ''}
</article>
</div>`;
    pages.push({ path: page, current: 'code', title: `${label} | ${cfg.name}`, description: `${kind}: ${src}`, body });
  }

  // 1. The finished connector (what builds the JAR).
  const finalGroup = [...map.final, map.pom].map(f => ({ page: f.page, label: f.file }));
  const stepOf = new Map();
  for (const s of map.steps) for (const f of s.files) stepOf.set(f.cls, { s, f });
  for (const f of [...map.final, map.pom]) {
    const st = stepOf.get(f.cls);
    filePage({
      page: f.page, src: f.src, label: f.file, kind: 'Connector source code', lang: f.cls === 'pom' ? 'xml' : 'java', group: finalGroup, groupTitle: 'Connector files',
      intro: `${esc(f.summary)} This is the file of the reference solution of increment 6, the one that builds the JAR.`,
      extraLinks: st ? `You write this file in increment ${st.s.number}: ${link(f.page, st.f.starterPage, 'the starter with the TODOs')} · ${link(f.page, st.f.solutionPage, 'the reference solution of that increment')}.` : '',
    });
    entries.push({ page: f.page, anchor: '', heading: f.file, section: '', text: f.summary, keywords: `java source code ${f.cls} ${f.pkg} connector jar` });
  }

  // 2. Per increment: starter and the reference solution of that increment.
  for (const s of map.steps) {
    const grpStarter = s.files.map(f => ({ page: f.starterPage, label: f.cls + '.java (starter)' }));
    const grpSol = s.files.map(f => ({ page: f.solutionPage, label: f.cls + '.java (solution)' }));
    for (const f of s.files) {
      filePage({
        page: f.starterPage, src: f.starterSrc, label: `${f.cls}.java (starter)`, kind: `Increment ${s.number} · starter`, lang: 'java', group: grpStarter, groupTitle: `Increment ${s.number} starter files`,
        intro: `This is the starter you work on in increment ${s.number}: it compiles, and the ${f.todos} TODO comment${f.todos === 1 ? '' : 's'} say what to build and which checkpoint each one makes pass. Your working copy is <code>${esc(f.starterSrc)}</code>.`,
        extraLinks: link(f.starterPage, f.solutionPage, 'The reference solution of this increment') + '.',
      });
      filePage({
        page: f.solutionPage, src: f.solutionSrc, label: `${f.cls}.java (solution)`, kind: `Increment ${s.number} · reference solution`, lang: 'java', group: grpSol, groupTitle: `Increment ${s.number} solution files`,
        intro: `This is the reference solution of increment ${s.number}. Try the starter first and compare afterwards.`,
        extraLinks: link(f.solutionPage, f.starterPage, 'The starter of this increment') + '.',
      });
      entries.push({ page: f.starterPage, anchor: '', heading: `${f.cls}.java (starter, increment ${s.number})`, section: String(s.number), text: `Starter file with ${f.todos} TODO comments`, keywords: `java starter todo ${f.cls} increment` });
      entries.push({ page: f.solutionPage, anchor: '', heading: `${f.cls}.java (solution, increment ${s.number})`, section: String(s.number), text: 'Reference solution of the increment', keywords: `java solution ${f.cls} increment` });
    }
  }

  // 3. The code landing page.
  const items = [
    { lvl: 2, id: 'code-jar', text: 'Build the JAR', n: 1 },
    { lvl: 2, id: 'code-files', text: 'The connector, file by file', n: 2 },
    { lvl: 2, id: 'code-steps', text: 'What you write in each increment', n: 3 },
  ];
  const idx = 'code/index.html';
  const pkgs = ['connect', 'ltl', 'cdc', 'tds'];
  const rows = map.final.slice().sort((a, b) => pkgs.indexOf(a.pkg) - pkgs.indexOf(b.pkg) || a.file.localeCompare(b.file)).map(f =>
    `<tr><td><code>${esc(f.pkg)}</code></td><td>${link(idx, f.page, f.file)}</td><td>${f.lines}</td><td>${esc(f.summary)}</td></tr>`).join('\n');
  const stepRows = map.steps.map(s => s.files.map((f, i) =>
    `<tr><td>${i === 0 ? s.number : ''}</td><td><code>${esc(f.cls)}.java</code></td><td>${link(idx, f.starterPage, 'starter')} (${f.todos} TODO${f.todos === 1 ? '' : 's'})</td><td>${link(idx, f.solutionPage, 'solution')}</td></tr>`).join('\n')).join('\n');
  const body = `<div class="page-grid">
<header class="title-block"><p class="category">Source code</p><h1>The connector source code</h1>
<p class="lede">The Java files that become one JAR, which Kafka Connect loads as a plugin. Every page is the real file, copied when the site is built.</p>
<p class="meta">${map.final.length} Java files · ${map.final.reduce((a, f) => a + f.lines, 0)} lines</p></header>
${contents(items)}
<article class="prose-site guide-body" id="article">
<h2 id="code-jar">Build the JAR</h2>
<p>Maven runs in a container, so you only need Docker. From the repository root:</p>
<pre data-lang="bash"><code>lab/env/mvn.sh solutions/06-package-and-run package -DskipTests</code></pre>
<p>The result is <code>lab/solutions/06-package-and-run/target/cdc-lab-06-package-and-run-0.1.0.jar</code>. The build file is ${link(idx, map.pom.page, 'pom.xml')} (Java 17; the Kafka Connect API and slf4j are provided by the Connect worker and are not packaged). The article section "The source code and the JAR" has the output I observed and the evidence file.</p>
<h2 id="code-files">The connector, file by file</h2>
<p>This is the reference solution of increment 6, the finished connector that passes all its checkpoints. The first column is the Java package under <code>com.phoenix.cdc.sybase</code>.</p>
<div class="tbl"><table><thead><tr><th>Package</th><th>File</th><th>Lines</th><th>What it does (first sentence of the class comment)</th></tr></thead><tbody>
${rows}
</tbody></table></div>
<h2 id="code-steps">What you write in each increment</h2>
<p>The starters contain TODO comments for exactly the files below. Everything else in an increment is given.</p>
<div class="tbl"><table><thead><tr><th>Increment</th><th>File you write</th><th>Starter</th><th>Reference</th></tr></thead><tbody>
${stepRows}
</tbody></table></div>
</article>
</div>`;
  pages.push({ path: idx, current: 'code', title: `The connector source code | ${cfg.name}`, description: 'The Java source of the connector and the pom.xml that builds the JAR.', body });
  entries.push({ page: idx, anchor: 'code-jar', heading: 'Build the JAR', section: '', text: 'lab/env/mvn.sh solutions/06-package-and-run package -DskipTests', keywords: 'maven package jar build shade pom' });
  entries.push({ page: idx, anchor: 'code-files', heading: 'The connector, file by file', section: '', text: 'Every Java file of the connector with a one-sentence summary', keywords: 'java source code files connector' });
  entries.push({ page: idx, anchor: 'code-steps', heading: 'What you write in each increment', section: '', text: 'Starter and reference solution files per increment', keywords: 'starter todo solution increment' });
  return { pages, entries };
};
