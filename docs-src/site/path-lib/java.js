// Java lessons of the learning path (stage 7): one lesson per file of the finished connector (sybase-cdc-connector/) and its
// pom.xml. Each page shows the unchanged file with numbered notes beside it. Sources: the Java files, the note files in
// docs-src/path/java-notes/, lab/path/java-members.json (javap) and lab/path/env-values.json. See contracts/java-notes.md.
const fs = require('fs');
const path = require('path');
const D = require('./data');
const { esc, text } = require('../util');
const { parse } = require('./frontmatter');

const ROOT = D.ROOT;
const MOD = 'sybase-cdc-connector';
const JAVA = `${MOD}/src/main/java`;
const NOTES = path.join(ROOT, 'docs-src', 'path', 'java-notes');
const PKG_RANK = { tds: 0, ltl: 1, cdc: 2, connect: 3, tools: 4 };
const FIRST_ORDER = 2;           // lesson 7.1 is the overview; the file lessons are 7.2 and up

const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const posix = p => p.split(path.sep).join('/');

// ---- Files, their relations and the build order --------------------------------------------------------------------
function sources() {
  const base = path.join(ROOT, JAVA);
  const files = walk(base).filter(f => f.endsWith('.java')).map(f => {
    const rel = posix(path.relative(ROOT, f));
    const cls = path.basename(f, '.java');
    return { cls, rel, pkg: path.basename(path.dirname(f)), text: fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') };
  });
  const names = files.map(f => f.cls);
  for (const f of files) {
    const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
    f.uses = names.filter(n => n !== f.cls && new RegExp('\\b' + n + '\\b').test(code));
  }
  for (const f of files) f.usedBy = files.filter(g => g.uses.includes(f.cls)).map(g => g.cls);
  return files;
}

// Build order: package rank (tds, ltl, cdc, connect, tools), and inside a package the classes it depends on first.
function ordered(files) {
  const by = Object.fromEntries(files.map(f => [f.cls, f]));
  const out = [], seen = new Set();
  const visit = f => {
    if (seen.has(f.cls)) return;
    seen.add(f.cls);
    for (const u of f.uses.map(n => by[n]).filter(g => g.pkg === f.pkg).sort((a, b) => a.cls.localeCompare(b.cls))) visit(u);
    out.push(f);
  };
  for (const f of [...files].sort((a, b) => (PKG_RANK[a.pkg] ?? 9) - (PKG_RANK[b.pkg] ?? 9) || a.cls.localeCompare(b.cls))) visit(f);
  return out.sort((a, b) => (PKG_RANK[a.pkg] ?? 9) - (PKG_RANK[b.pkg] ?? 9));   // stable: keeps the dependency order inside a package
}

function pomFile() {
  const rel = `${MOD}/pom.xml`;
  return { cls: 'pom', rel, pkg: '', text: fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'), uses: [], usedBy: [], isPom: true };
}

function allFiles() {
  const list = ordered(sources());
  list.push(pomFile());
  list.forEach((f, i) => { f.order = FIRST_ORDER + i; f.id = `7.${f.order}`; f.slug = f.isPom ? 'pom' : f.cls; });
  return list;
}

// ---- Notes ---------------------------------------------------------------------------------------------------------
// A note file: front matter (file:), then entries. An entry starts at column 0 with "<kind>: <value>"; its text is the
// indented lines below it. Kinds: purpose, class, method, lines, design, env, fits.
function readNotes(cls) {
  const f = path.join(NOTES, cls + '.md');
  if (!fs.existsSync(f)) return null;
  const { meta, body } = parse(fs.readFileSync(f, 'utf8'));
  const entries = [];
  let cur = null;
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^(purpose|class|method|lines|design|env|fits)(?::\s*(.*))?$/);
    if (m && !/^\s/.test(line)) { cur = { kind: m[1], arg: (m[2] || '').trim(), text: [] }; entries.push(cur); continue; }
    if (cur && line.trim()) cur.text.push(line.trim());
  }
  for (const e of entries) e.text = e.text.join(' ');
  return { meta, entries };
}

// ---- Locating declarations in the source ---------------------------------------------------------------------------
const MODS = '(?:(?:public|protected|private|static|final|abstract|synchronized|default|native)\\s+)*';
function countParams(s) {
  s = s.trim();
  if (!s) return 0;
  let depth = 0, n = 1;
  for (const c of s) { if ('<(['.includes(c)) depth++; else if ('>)]'.includes(c)) depth--; else if (c === ',' && depth === 0) n++; }
  return n;
}
function lineOfClass(lines, name) {
  const short = name.split('.').pop();
  // an anonymous class (Outer.1) has no name: it starts at the first "new Type(...) {"
  if (/^\d+$/.test(short)) return lines.findIndex(l => /\bnew\s+\w+\s*\([^)]*\)\s*\{\s*$/.test(l)) + 1;
  const re = new RegExp('^\\s*(?:@\\w+\\s+)*' + MODS + '(?:class|interface|enum|record)\\s+' + short + '\\b');
  return lines.findIndex(l => re.test(l)) + 1;
}
function lineOfMethod(lines, cls, key) {
  const m = key.match(/^([\w$<>]+)\((.*)\)$/);
  if (!m) return 0;
  const name = m[1], want = countParams(m[2]);
  const isCtor = name === '<init>';
  const shortName = isCtor ? cls.split('.').pop() : name;
  const re = isCtor
    ? new RegExp('^\\s*(?:@\\w+\\s+)*' + MODS + shortName + '\\s*\\(')
    : new RegExp('^\\s*(?:@\\w+\\s+)*' + MODS + '(?:<[^>]+>\\s+)?[\\w<>\\[\\],.? ]+\\s+' + shortName + '\\s*\\(');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(return|throw|new|else|if|for|while|case)\b/.test(l) || /^\s*(\*|\/\/|\/\*)/.test(l) || !re.test(l)) continue;
    let sig = l.slice(l.indexOf('(') + 1);
    for (let k = i + 1; k < Math.min(lines.length, i + 8) && !sig.includes(')'); k++) sig += ' ' + lines[k];
    const params = sig.slice(0, sig.lastIndexOf(')') >= 0 ? sig.indexOf(')') : sig.length);
    // the declaration must end the statement with { or ; (a call would not)
    const tail = sig.slice(sig.indexOf(')') + 1);
    if (!/^\s*(?:throws[\w\s.,]+)?\s*(\{|;|$)/.test(tail)) continue;
    if (countParams(params) === want) return i + 1;
  }
  return 0;
}

// A member of a record or an enum that the compiler generates (accessors, equals, values, ...) has no declaration of its own:
// it is placed on the line that declares the record or enum.
function lineOfMember(lines, cls, key) {
  const l = lineOfMethod(lines, cls, key);
  if (l) return l;
  const cl = lineOfClass(lines, cls);
  // records and enums have generated members; any class has an implicit default constructor
  if (cl && (/\b(record|enum)\s/.test(lines[cl - 1]) || key.startsWith('<init>'))) return cl;
  return 0;
}

// ---- Rendering -----------------------------------------------------------------------------------------------------
function codeHtml(f, markers) {
  const lines = f.text.split(/(?<=\n)/);
  const out = lines.map((l, i) => {
    const n = i + 1;
    const mk = (markers[n] || []).map(k => `<a class="nm" href="#note-${k}" data-n="${k}" aria-label="Note ${k}"></a>`).join('');
    return `<span class="ln" id="L${n}">${mk}${esc(l)}</span>`;
  }).join('');
  return `<pre data-lang="${f.isPom ? 'xml' : 'java'}" class="code-lines" data-file="${esc(f.rel)}"><code>${out}</code></pre>`;
}

const envAnchor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function envValues() {
  const f = path.join(ROOT, 'lab', 'path', 'env-values.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}

// Everything between the lesson description and the steps: purpose, how it fits, the code, the notes, the environment values.
function pageHtml(f, files, problem) {
  const notes = readNotes(f.cls);
  if (!notes) { problem(`java lesson ${f.id}: no note file docs-src/path/java-notes/${f.cls}.md`); return { html: '<div class="step-missing"><strong>No notes yet.</strong></div>', items: [] }; }
  const lines = f.text.split('\n');
  const by = Object.fromEntries(files.map(x => [x.cls, x]));
  const lessonHref = c => `${by[c].slug}.html`;
  const pur = notes.entries.find(e => e.kind === 'purpose');
  const fits = notes.entries.find(e => e.kind === 'fits');

  // Placed notes: class, method and line notes get a marker number in order of their line; design and env notes have none.
  const placed = [];
  for (const e of notes.entries) {
    let line = 0;
    if (e.kind === 'class') line = lineOfClass(lines, e.arg);
    else if (e.kind === 'method') { const m = e.arg.match(/^([\w$.]+)\.(.+)$/); line = m ? lineOfMember(lines, m[1], m[2]) : 0; }
    else if (e.kind === 'lines') line = Number((e.arg.match(/^(\d+)/) || [])[1]) || 0;
    if (['class', 'method', 'lines'].includes(e.kind)) {
      if (!line) problem(`java lesson ${f.id}: cannot find the line of ${e.kind} note "${e.arg}" in ${f.rel}`);
      placed.push({ e, line });
    }
  }
  placed.sort((a, b) => a.line - b.line || (a.e.kind === 'class' ? -1 : 1));
  placed.forEach((p, i) => { p.k = i + 1; });
  const markers = {};
  for (const p of placed) (markers[p.line] = markers[p.line] || []).push(p.k);

  const label = p => p.e.kind === 'class' ? `<span class="nk">class</span> <code>${esc(p.e.arg)}</code>` : p.e.kind === 'method' ? `<span class="nk">method</span> <code>${esc(p.e.arg.replace(/^[\w$.]+\./, ''))}</code>` : `<span class="nk">lines</span> <code>${esc(p.e.arg)}</code>`;
  const noteList = placed.map(p => `<li id="note-${p.k}" class="note-item"><span class="nnum">${p.k}</span><div><p class="nhead">${label(p)} <a class="nback" href="#L${p.line}">line ${p.line}</a></p><p>${esc(p.e.text)}</p></div></li>`).join('\n');
  const design = notes.entries.filter(e => e.kind === 'design').map(e => `<li>${esc(e.text)}</li>`).join('');

  const uses = f.uses.map(c => `<a href="${lessonHref(c)}"><code>${esc(c)}</code></a>`).join(', ') || 'no other class of the connector';
  const usedBy = f.usedBy.map(c => `<a href="${lessonHref(c)}"><code>${esc(c)}</code></a>`).join(', ') || 'no other class of the connector (it is an entry point or a build file)';

  const envEntries = notes.entries.filter(e => e.kind === 'env');
  const vals = envValues();
  const envRows = envEntries.map(e => {
    const v = vals.find(x => x.name === e.arg);
    return `<tr><td><a class="env-ref" href="../env-values.html#${envAnchor(e.arg)}">${esc(e.arg)}</a></td><td>${v ? `<code>${esc(v.labValue)}</code>` : '?'}</td><td>${esc(e.text)}</td><td>${v ? esc(v.change) : ''}</td></tr>`;
  }).join('');
  const envBlock = envEntries.length
    ? `<h3 id="java-env">Environment-dependent values in this file</h3><div class="tbl"><table><thead><tr><th>Value</th><th>In the lab</th><th>How the file uses it</th><th>What to change elsewhere</th></tr></thead><tbody>${envRows}</tbody></table></div>`
    : `<h3 id="java-env">Environment-dependent values in this file</h3><p>None: this file does not read a hostname, port, credential, database name, topic name, path or configuration property.</p>`;

  const idx = files.indexOf(f);
  const html = `<div class="java-lesson" data-file="${esc(f.rel)}">
<p class="java-file"><strong>File:</strong> <code>${esc(f.rel)}</code> (${f.text.split('\n').length - (f.text.endsWith('\n') ? 1 : 0)} lines)</p>
<div class="lesson-box"><p class="box-title">Purpose</p><p>${esc(pur ? pur.text : '')}</p></div>
<h3 id="java-fits">How it fits</h3>
<p>${esc(fits ? fits.text : '')}</p>
<ul class="fits-list"><li><strong>Uses:</strong> ${uses}</li><li><strong>Used by:</strong> ${usedBy}</li></ul>
<h3 id="java-code">The code</h3>
<p>The file exactly as it is in the repository. The numbered markers in the left margin point at the notes below.</p>
${codeHtml(f, markers)}
<h3 id="java-notes">Notes on the code</h3>
<ol class="note-list">${noteList}</ol>
${design ? `<h3 id="java-design">Design decisions</h3><ul>${design}</ul>` : ''}
${envBlock}
</div>`;
  const items = [
    { lvl: 3, id: 'java-fits', text: 'How it fits', n: '' }, { lvl: 3, id: 'java-code', text: 'The code', n: '' },
    { lvl: 3, id: 'java-notes', text: 'Notes on the code', n: '' }, ...(design ? [{ lvl: 3, id: 'java-design', text: 'Design decisions', n: '' }] : []),
    { lvl: 3, id: 'java-env', text: 'Environment-dependent values', n: '' },
  ];
  return { html, items, notes, placed };
}

// Lesson entries for the path (see all.js). `body` follows the lesson format so the lint check treats them like the others.
function lessonEntries() {
  const files = allFiles();
  return files.map((f, i) => {
    const notes = readNotes(f.cls);
    const pur = notes && notes.entries.find(e => e.kind === 'purpose');
    const first = pur ? pur.text.split(/(?<=\.)\s/)[0] : `The notes for ${f.cls} are not written yet.`;
    const title = f.isPom ? 'The pom.xml build file' : `The ${f.cls} class`;
    const env = notes && notes.entries.some(e => e.kind === 'env');
    const objectives = [
      `You can say what ${f.isPom ? 'the pom.xml' : f.cls} is for and where it sits among the connector's files.`,
      `You can find every ${f.isPom ? 'dependency and plugin entry' : 'class and method'} of the file and say why it exists.`,
      ...(env ? ['You know which environment-dependent values the file uses and what to change elsewhere.'] : []),
    ];
    return {
      file: `generated:${f.id}`, generated: true, javaFile: f, pageSlug: f.slug,
      meta: {
        id: f.id, stage: 'java', order: f.order, title, summary: first,
        objectives, prerequisites: [i === 0 ? '7.1' : files[i - 1].id], prereqCheck: 'in-lab-jar',
        noDiagramReason: "The file page has numbered notes beside the code; the class relationships are drawn in lesson 7.1 and the processing flow in lesson 7.22.",
      },
      body: `## Description\n\n{{java:${f.slug}}}\n\n## Steps\n\n### 1. Find it in the JAR the lab runs\n\n{{cmd:in-lab-jar}}\n{{out:in-lab-jar}}\n\n### 2. Count the lines\n\n{{cmd:lines}}\n{{out:lines}}\n\n## Troubleshooting\n\nNo failures were observed in the recorded runs.\n\n## Not tested\n\n- Writing this file yourself: the optional exercise for it (if there is one) is in the build-along guide, and it was not part of this lesson's run.\n`,
    };
  });
}

// The commands of a Java lesson (written to lab/path/steps/<id>.json by lab/path/gen-java-steps.js).
function stepsFor(f) {
  const jar = 'plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar';
  return {
    lesson: f.id,
    steps: [
      f.isPom
        ? { id: 'in-lab-jar', run: `unzip -Z1 ${jar} | grep -c 'META-INF/maven/.*/pom.xml'` }
        : { id: 'in-lab-jar', run: `unzip -Z1 ${jar} | grep '/${f.cls}[.$]' | sed 's#com/phoenix/cdc/sybase/##'` },
      { id: 'lines', run: `wc -l ${f.rel}` },
    ],
  };
}

module.exports = { allFiles, sources, readNotes, pageHtml, lessonEntries, stepsFor, lineOfClass, lineOfMethod, lineOfMember, countParams, FIRST_ORDER, MOD, JAVA };
