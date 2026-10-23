// Readers for the learning path sources: stages, lessons, steps files and recorded evidence.
const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');

const ROOT = path.join(__dirname, '..', '..', '..');
const LESSONS = path.join(ROOT, 'docs-src', 'path', 'lessons');
const STAGES = path.join(ROOT, 'docs-src', 'path', 'stages.json');
const STEPS = path.join(ROOT, 'lab', 'path', 'steps');
const EVIDENCE = path.join(ROOT, 'docs', 'evidence', 'path');

const stages = () => JSON.parse(fs.readFileSync(STAGES, 'utf8'));

// Lessons written as Markdown files (the generated Java lessons are added by build-path.js).
function lessons() {
  if (!fs.existsSync(LESSONS)) return [];
  return fs.readdirSync(LESSONS).filter(f => f.endsWith('.md')).sort().map(f => {
    const { meta, body } = parse(fs.readFileSync(path.join(LESSONS, f), 'utf8'));
    return { file: f, meta, body };
  });
}

function stepsOf(lessonId) {
  const f = path.join(STEPS, lessonId + '.json');
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

// Evidence file format (see contracts/lesson-source.md): "## step <id>", "$ <command>", output, "# exit N, S s".
function evidenceOf(lessonId) {
  const f = path.join(EVIDENCE, lessonId + '.txt');
  if (!fs.existsSync(f)) return null;
  const text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const header = {};
  for (const m of text.matchAll(/^# (Captured|Lesson|Images):\s*(.*)$/gm)) header[m[1].toLowerCase()] = m[2];
  const out = { header, steps: {} };
  const parts = text.split(/^## step /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const id = part.slice(0, nl).trim();
    const rest = part.slice(nl + 1);
    const lines = rest.split('\n');
    const cmd = lines[0].startsWith('$ ') ? lines[0].slice(2) : '';
    const exitAt = lines.findIndex(l => /^# exit -?\d+, [\d.]+ s$/.test(l));
    const m = exitAt >= 0 ? lines[exitAt].match(/^# exit (-?\d+), ([\d.]+) s$/) : null;
    const body = lines.slice(1, exitAt >= 0 ? exitAt : lines.length).join('\n').replace(/\n+$/, '');
    out.steps[id] = { cmd, output: body, exit: m ? Number(m[1]) : null, seconds: m ? Number(m[2]) : null };
  }
  return out;
}

// Replace the matches of every mask regular expression by a named placeholder, e.g. <timestamp>.
// A mask is a string "name=regex" (the name is shown) or a plain regex (shown as <value>).
function applyMasks(text, masks) {
  let out = text;
  for (const m of masks || []) {
    const i = m.indexOf('=');
    const named = i > 0 && /^[a-z][a-z-]*$/.test(m.slice(0, i));
    const name = named ? m.slice(0, i) : 'value';
    const re = new RegExp(named ? m.slice(i + 1) : m, 'g');
    out = out.replace(re, `<${name}>`);
  }
  return out;
}

const idKey = id => { const [s, l] = id.split('.').map(Number); return s * 1000 + l; };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

module.exports = { ROOT, LESSONS, STEPS, EVIDENCE, stages, lessons, stepsOf, evidenceOf, applyMasks, idKey, slug };
