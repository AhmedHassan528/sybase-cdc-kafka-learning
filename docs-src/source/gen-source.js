// Builds docs/source/<Class>.html: the real Java file, line-numbered, interleaved with the annotations
// written in docs-src/source/notes/<Class>.notes. Fails if any non-blank source line is not covered.
//
// Notes format:
//   @file  relative/path/to/File.java
//   @summary  <html>            (one or more lines, shown at the top)
//   @@ 12-20                    (a line range of the source; 1-based, inclusive)
//   <html explanation ...>      (everything until the next @@ belongs to this range)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const NOTES = path.join(__dirname, 'notes');
const OUT = path.join(ROOT, 'docs', 'source');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Small Java highlighter: comments, strings, chars, keywords, annotations, numbers.
const KW = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record yield sealed permits non-sealed true false null').split(' '));
function highlight(line, state) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (state.inBlock) {
      const end = line.indexOf('*/', i);
      const stop = end < 0 ? line.length : end + 2;
      out += '<span class="c">' + esc(line.slice(i, stop)) + '</span>';
      i = stop;
      if (end >= 0) state.inBlock = false;
      continue;
    }
    const rest = line.slice(i);
    if (rest.startsWith('//')) { out += '<span class="c">' + esc(rest) + '</span>'; break; }
    if (rest.startsWith('/*')) { state.inBlock = true; continue; }
    const ch = line[i];
    if (ch === '"' || ch === '\'') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
      out += '<span class="s">' + esc(line.slice(i, j + 1)) + '</span>';
      i = j + 1;
      continue;
    }
    if (ch === '@' && /[A-Za-z]/.test(line[i + 1] || '')) {
      const m = /^@[A-Za-z_][\w.]*/.exec(rest);
      out += '<span class="a">' + esc(m[0]) + '</span>';
      i += m[0].length;
      continue;
    }
    const w = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (w) {
      const word = w[0];
      if (KW.has(word)) out += '<span class="k">' + word + '</span>';
      else if (/^[A-Z]/.test(word)) out += '<span class="t">' + word + '</span>';
      else out += esc(word);
      i += word.length;
      continue;
    }
    const n = /^(0x[0-9a-fA-F_]+|\d[\d_]*(\.\d+)?[LlFfDd]?)/.exec(rest);
    if (n) { out += '<span class="n">' + n[0] + '</span>'; i += n[0].length; continue; }
    out += esc(ch);
    i++;
  }
  return out;
}

function parseNotes(text) {
  const lines = text.split(/\r?\n/);
  const n = { file: null, summary: [], blocks: [] };
  let cur = null;
  let inSummary = false;
  for (const l of lines) {
    if (l.startsWith('@file ')) { n.file = l.slice(6).trim(); continue; }
    if (l.startsWith('@summary')) { inSummary = true; n.summary.push(l.slice(8).trim()); continue; }
    const m = /^@@\s*(\d+)\s*-\s*(\d+)\s*$/.exec(l) || /^@@\s*(\d+)\s*$/.exec(l);
    if (m) {
      inSummary = false;
      cur = { from: Number(m[1]), to: Number(m[2] || m[1]), html: [] };
      n.blocks.push(cur);
      continue;
    }
    if (inSummary) n.summary.push(l);
    else if (cur) cur.html.push(l);
  }
  return n;
}

function page(cls, notes, src) {
  const lines = src.replace(/\r/g, '').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  // coverage check
  const covered = new Array(lines.length + 1).fill(false);
  for (const b of notes.blocks) {
    if (b.from < 1 || b.to > lines.length || b.from > b.to) throw new Error(`${cls}: bad range ${b.from}-${b.to} (file has ${lines.length} lines)`);
    for (let k = b.from; k <= b.to; k++) covered[k] = true;
  }
  const missing = [];
  lines.forEach((l, idx) => { if (l.trim() !== '' && !covered[idx + 1]) missing.push(idx + 1); });
  if (missing.length) throw new Error(`${cls}: lines without annotation: ${missing.join(', ')}`);

  const state = { inBlock: false };
  const hl = lines.map(l => highlight(l, state));
  const blocks = [...notes.blocks].sort((a, b) => a.from - b.from);
  let body = '';
  for (const b of blocks) {
    const code = [];
    for (let k = b.from; k <= b.to; k++) code.push(`<span class="ln" id="L${k}">${k}</span>${hl[k - 1] || ' '}`);
    body += `<section class="blk" id="b${b.from}"><pre class="code"><code>${code.join('\n')}</code></pre>` +
      `<div class="note"><div class="range">Lines ${b.from === b.to ? b.from : b.from + '–' + b.to}</div>${b.html.join('\n')}</div></section>\n`;
  }
  const rel = notes.file;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${cls}.java · source reference</title>
<link rel="stylesheet" href="../assets/css/styles.css"></head>
<body class="source-page">
<header class="src-head"><a href="../index.html#ch-source">← Back to the handbook (source reference)</a>
<h1><code>${cls}.java</code></h1><p class="path"><code>${esc(rel)}</code> · ${lines.length} lines · every non-blank line is annotated (checked by gen-source.js)</p>
<div class="summary">${notes.summary.join('\n')}</div></header>
<main class="src-main">${body}</main>
<footer class="src-foot"><a href="../index.html#ch-source">← Back to the handbook</a></footer>
</body></html>`;
}

fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(NOTES).filter(f => f.endsWith('.notes')).sort();
const index = [];
let failed = 0;
for (const f of files) {
  const cls = f.replace(/\.notes$/, '');
  const notes = parseNotes(fs.readFileSync(path.join(NOTES, f), 'utf8'));
  const srcPath = path.join(ROOT, notes.file);
  try {
    const src = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(path.join(OUT, cls + '.html'), page(cls, notes, src));
    index.push({ cls, file: notes.file, lines: src.split('\n').length - 1, blocks: notes.blocks.length });
    console.log('ok  ', cls);
  } catch (e) {
    failed++;
    console.error('FAIL', e.message);
  }
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));
if (failed) { console.error(failed + ' file(s) failed coverage'); process.exit(1); }
