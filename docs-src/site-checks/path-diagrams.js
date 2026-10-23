// Check (SC-006): each of the five required topics has a diagram, every diagram has alt text, an existing SVG and a live step
// whose recorded output shows the same state.
const { fs, path, ROOT } = require('./common');
const D = require('../site/path-lib/data');
let problems = 0;
const bad = (id, msg) => { problems++; console.log(`FAIL ${id}: ${msg}`); };
const TOPICS = ['docker', 'log-capture', 'repagent', 'connector', 'kafka-delivery'];

console.log('path-diagrams: five topics, each tied to live evidence');
const f = path.join(ROOT, 'docs-src', 'path', 'diagrams.json');
if (!fs.existsSync(f)) { bad('diagrams.json', 'missing'); console.log(`problems: ${problems}`); process.exit(1); }
const list = JSON.parse(fs.readFileSync(f, 'utf8'));
for (const t of TOPICS) if (!list.some(d => d.topic === t)) bad(t, 'no diagram for this topic');
const lessonIds = new Set(require('../site/path-lib/all').all().map(l => String(l.meta.id)));
for (const d of list) {
  const id = d.id;
  if (!d.alt) bad(id, 'no alt text');
  const svg = path.join(ROOT, d.source);
  if (!d.source || !fs.existsSync(svg)) bad(id, `source SVG "${d.source}" does not exist`);
  if (d.topic !== 'overview') {
    const [lesson, step] = String(d.liveStep || '').split('/');
    if (!lesson || !step) { bad(id, 'liveStep must look like 3.1/ps'); continue; }
    const ev = D.evidenceOf(lesson);
    if (!ev || !ev.steps[step]) bad(id, `liveStep ${d.liveStep} has no recorded output`);
    if (!(d.lessons || []).length) bad(id, 'no lessons show this diagram');
    for (const l of d.lessons || []) if (!lessonIds.has(String(l))) bad(id, `lesson ${l} does not exist`);
  }
}
console.log(`diagrams: ${list.length}; topics covered: ${TOPICS.filter(t => list.some(d => d.topic === t)).length} of ${TOPICS.length}; problems: ${problems}`);
process.exit(problems ? 1 : 0);
