// Check (SC-003, SC-010): every lesson of the learning path has every required part.
// Rules are in specs/003-end-to-end-learning-path/contracts/lesson-source.md and data-model.md.
const { fs, path, ROOT } = require('./common');
const D = require('../site/path-lib/data');
let problems = 0;
const bad = (lesson, msg) => { problems++; console.log(`FAIL ${lesson}: ${msg}`); };

console.log('path-lint: lesson parts, ids, order, prerequisites, steps, troubleshooting, example rule');
const stages = (() => { try { return D.stages(); } catch (e) { bad('stages.json', e.message); return []; } })();
stages.forEach((s, i) => {
  if (s.number !== i + 1) bad('stages.json', `stage ${s.id} has number ${s.number}, expected ${i + 1} (contiguous, fixed order)`);
  if (!s.title || !s.goal) bad('stages.json', `stage ${s.id} needs a title and a goal`);
});
const stageNo = Object.fromEntries(stages.map(s => [s.id, s.number]));

const all = require('../site/path-lib/all').all();
if (!all.length) { bad('lessons', 'no lessons found in docs-src/path/lessons'); }

const diagrams = (() => { const f = path.join(ROOT, 'docs-src', 'path', 'diagrams.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).map(d => d.id) : []; })();
const ids = new Set();
const orderByStage = {};
const HEADINGS = ['Description', 'Steps', 'Troubleshooting', 'Not tested'];
const EXAMPLE_SENTENCE = 'Example, not run in this lab';

for (const L of all) {
  const m = L.meta, id = m.id || L.file;
  for (const k of ['id', 'stage', 'order', 'title', 'summary', 'objectives', 'prerequisites']) if (m[k] === undefined || m[k] === '') bad(id, `front matter field "${k}" is missing`);
  if (!/^\d+\.\d+$/.test(String(m.id))) bad(id, `id "${m.id}" must look like 3.1`);
  if (ids.has(m.id)) bad(id, 'duplicate id'); ids.add(m.id);
  if (!(m.stage in stageNo)) bad(id, `unknown stage "${m.stage}"`);
  else {
    if (String(m.id).split('.')[0] !== String(stageNo[m.stage])) bad(id, `id prefix does not match stage number ${stageNo[m.stage]}`);
    if (String(m.id).split('.')[1] !== String(m.order)) bad(id, `id suffix does not match order ${m.order}`);
    (orderByStage[m.stage] = orderByStage[m.stage] || []).push(m.order);
  }
  const words = String(m.title || '').split(/\s+/).filter(Boolean).length;
  if (words < 2 || words > 10) bad(id, `title has ${words} words (2 to 10)`);
  if (!Array.isArray(m.objectives) || m.objectives.length < 2 || m.objectives.length > 5) bad(id, 'objectives must list 2 to 5 items');
  if (!Array.isArray(m.prerequisites)) bad(id, 'prerequisites must be a list');
  else for (const p of m.prerequisites) {
    if (!/^\d+\.\d+$/.test(String(p))) bad(id, `prerequisite "${p}" is not a lesson id`);
    else if (D.idKey(String(p)) >= D.idKey(String(m.id))) bad(id, `prerequisite ${p} is not an earlier lesson`);
  }
  if (!m.diagrams && !m.noDiagramReason) bad(id, 'needs diagrams or noDiagramReason');
  for (const d of m.diagrams || []) if (!diagrams.includes(d)) bad(id, `diagram "${d}" is not in diagrams.json`);

  // Body headings in the fixed order.
  const heads = [...L.body.matchAll(/^## (.+)$/gm)].map(x => x[1].trim());
  if (heads.join('|') !== HEADINGS.join('|')) bad(id, `second-level headings are [${heads.join(', ')}], expected [${HEADINGS.join(', ')}]`);

  // Steps, commands and outputs.
  const stepsFile = D.stepsOf(String(m.id));
  const cmds = [...L.body.matchAll(/\{\{cmd:([^}]+)\}\}/g)].map(x => x[1]);
  const outs = [...L.body.matchAll(/\{\{out:([^}]+)\}\}/g)].map(x => x[1]);
  if (m.example === true) {
    if (stepsFile) bad(id, 'an example lesson must not have a steps file');
    if (outs.length || cmds.length) bad(id, 'an example lesson must not use {{cmd:}} or {{out:}}');
    if (!L.body.includes(EXAMPLE_SENTENCE)) bad(id, `an example lesson needs the box "${EXAMPLE_SENTENCE}"`);
    if (!/no TLS/i.test(L.body)) bad(id, 'the example lesson must say the lab has no TLS');
  } else {
    if (L.body.includes(EXAMPLE_SENTENCE)) bad(id, 'the example box is only allowed in lessons with example: true');
    if (!stepsFile) bad(id, `no steps file lab/path/steps/${m.id}.json`);
    else {
      const have = new Set(stepsFile.steps.map(s => s.id));
      if (stepsFile.steps.length !== have.size) bad(id, 'duplicate step ids');
      for (const c of cmds) if (!have.has(c)) bad(id, `{{cmd:${c}}} is not a step of the lesson`);
      for (const o of outs) if (!have.has(o)) bad(id, `{{out:${o}}} is not a step of the lesson`);
      for (const s of stepsFile.steps) {
        if (!cmds.includes(s.id)) bad(id, `step "${s.id}" is never shown ({{cmd:${s.id}}})`);
        if (!s.noOutput && !outs.includes(s.id)) bad(id, `step "${s.id}" has no {{out:${s.id}}}`);
      }
      if ((m.prerequisites || []).length && !have.has(m.prereqCheck)) bad(id, `prereqCheck "${m.prereqCheck}" is not a step of the lesson`);
    }
    if (!cmds.length) bad(id, 'the Steps part shows no command');
  }

  // Troubleshooting items: symptom, cause, fix, seen in.
  const tr = (L.body.split(/^## Troubleshooting\s*$/m)[1] || '').split(/^## /m)[0];
  const items = tr.split(/\n(?=- )/).map(s => s.trim()).filter(s => s.startsWith('- '));
  if (!items.length && !/No failures were observed in the recorded runs\./.test(tr)) bad(id, 'Troubleshooting needs items or the sentence "No failures were observed in the recorded runs."');
  for (const it of items) {
    for (const part of ['**Symptom**', '**Cause**', '**Fix**', '**Seen in**']) if (!it.includes(part)) bad(id, `a troubleshooting item lacks ${part}: ${it.slice(0, 50)}`);
    const seen = (it.match(/\*\*Seen in\*\*:\s*([A-Za-z0-9_.-]+)/) || [])[1];
    if (seen && stepsFile && !stepsFile.steps.some(s => s.id === seen)) bad(id, `"Seen in" step "${seen}" does not exist`);
  }
  const nt = (L.body.split(/^## Not tested\s*$/m)[1] || '').trim();
  if (!nt) bad(id, 'the "Not tested" part is empty (say what was not tested, or "Nothing was left untested.")');
}

// Orders contiguous from 1 within each stage.
for (const [st, orders] of Object.entries(orderByStage)) {
  const sorted = [...orders].sort((a, b) => a - b);
  sorted.forEach((o, i) => { if (o !== i + 1) bad(st, `lesson orders are [${sorted.join(', ')}], expected 1..${sorted.length} without gaps`); });
}
for (const s of stages) if (!orderByStage[s.id]) bad(s.id, 'stage has no lessons');

console.log(`lessons checked: ${all.length}; stages: ${stages.length}; problems: ${problems}`);
process.exit(problems ? 1 : 0);
