// Runs the steps of the learning path lessons in the real lab and records the output as evidence.
//   node lab/path/runner.js lesson <id>      run one lesson, write docs/evidence/path/<id>.txt
//   node lab/path/runner.js path             reset the lab, run every lesson in order, write the evidence and _run.txt
//   node lab/path/runner.js verify           reset the lab, run every lesson again and compare the masked output with the
//                                            recorded evidence (nothing is overwritten); exit 1 on any difference
// Steps files: lab/path/steps/<lesson-id>.json (contracts/lesson-source.md). Commands run from the repository root in Git Bash.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const STEPS = path.join(__dirname, 'steps');
const EVIDENCE = path.join(ROOT, 'docs', 'evidence', 'path');
const idKey = id => { const [s, l] = id.split('.').map(Number); return s * 1000 + l; };
const strip = s => s.replace(/\r\n/g, '\n').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n+$/, '');
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function applyMasks(text, masks) {
  let out = text;
  for (const m of masks || []) {
    const i = m.indexOf('=');
    const named = i > 0 && /^[a-z][a-z-]*$/.test(m.slice(0, i));
    out = out.replace(new RegExp(named ? m.slice(i + 1) : m, 'g'), `<${named ? m.slice(0, i) : 'value'}>`);
  }
  return out;
}

// PATH_SKIP="9.4 7.22" leaves lessons out of a path run (used while the pieces they need are still being written).
const SKIP = (process.env.PATH_SKIP || '').split(/[ ,]+/).filter(Boolean);
function lessonIds() {
  return fs.readdirSync(STEPS).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).filter(id => !SKIP.includes(id)).sort((a, b) => idKey(a) - idKey(b));
}
function load(id) { return JSON.parse(fs.readFileSync(path.join(STEPS, id + '.json'), 'utf8')); }

function runOnce(cmd) {
  const t0 = Date.now();
  const r = cp.spawnSync('bash', ['-c', 'exec 2>&1; ' + cmd], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  return { output: strip(r.stdout || ''), exit: r.status === null ? 124 : r.status, seconds: (Date.now() - t0) / 1000 };
}

function runStep(step) {
  const t0 = Date.now();
  let r = runOnce(step.run);
  if (step.wait) {
    const re = new RegExp(step.wait.until);
    const limit = Date.now() + (step.wait.timeoutSeconds || 60) * 1000;
    while (!re.test(r.output) && Date.now() < limit) { sleep(2000); r = runOnce(step.run); }
    if (!re.test(r.output)) r.exit = 124;   // the wait ran out
  }
  r.seconds = (Date.now() - t0) / 1000;
  return r;
}

function images() {
  const r = cp.spawnSync('docker', ['ps', '--format', '{{.Names}}={{.Image}}'], { encoding: 'utf8' });
  return (r.stdout || '').split('\n').filter(l => l.startsWith('cdc-lab-')).join(' ');
}

// Run every step of a lesson. Returns { ok, steps: {id: result}, failed }.
function runLesson(id, log = console.log) {
  const def = load(id);
  const steps = {};
  for (const s of def.steps) {
    log(`  step ${id}/${s.id}: ${s.run.length > 90 ? s.run.slice(0, 87) + '...' : s.run}`);
    const r = runStep(s);
    steps[s.id] = r;
    const want = s.expectExit === undefined ? 0 : s.expectExit;
    if (r.exit !== want) { log(`  FAIL exit ${r.exit}, expected ${want}\n${r.output.split('\n').slice(-12).join('\n')}`); return { ok: false, steps, failed: s.id, def }; }
  }
  return { ok: true, steps, def };
}

function evidenceText(id, res) {
  const lines = [`# Captured: ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}`, `# Lesson:   ${id}`, `# Images:   ${images()}`, ''];
  for (const s of res.def.steps) {
    const r = res.steps[s.id];
    if (!r) continue;
    lines.push(`## step ${s.id}`, `$ ${s.run}`, r.output, `# exit ${r.exit}, ${r.seconds.toFixed(1)} s`, '');
  }
  return lines.join('\n');
}

function writeEvidence(id, res) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE, id + '.txt'), evidenceText(id, res));
}

function readEvidence(id) {
  const f = path.join(EVIDENCE, id + '.txt');
  if (!fs.existsSync(f)) return null;
  const out = {};
  for (const part of fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split(/^## step /m).slice(1)) {
    const nl = part.indexOf('\n'), sid = part.slice(0, nl).trim(), lines = part.slice(nl + 1).split('\n');
    const at = lines.findIndex(l => /^# exit -?\d+, [\d.]+ s$/.test(l));
    out[sid] = lines.slice(1, at >= 0 ? at : lines.length).join('\n').replace(/\n+$/, '');
  }
  return out;
}

const mode = process.argv[2];
if (mode === 'lesson') {
  const id = process.argv[3];
  if (!id || !fs.existsSync(path.join(STEPS, id + '.json'))) { console.log('usage: runner.js lesson <id> (a steps file lab/path/steps/<id>.json must exist)'); process.exit(2); }
  console.log(`lesson ${id}`);
  const res = runLesson(id);
  writeEvidence(id, res);
  console.log(res.ok ? `lesson ${id}: ${Object.keys(res.steps).length} steps ok` : `lesson ${id}: FAILED at step ${res.failed}`);
  process.exit(res.ok ? 0 : 1);
} else if (mode === 'path' || mode === 'verify') {
  const verify = mode === 'verify';
  const t0 = Date.now();
  console.log(`${mode}: resetting the lab (lab/env/reset.sh)`);
  const rs = runOnce('bash lab/env/reset.sh');
  if (rs.exit !== 0) { console.log('FAIL reset\n' + rs.output); process.exit(1); }
  let diffs = 0, steps = 0;
  const times = [];
  for (const id of lessonIds()) {
    console.log(`lesson ${id}`);
    const l0 = Date.now();
    const res = runLesson(id);
    times.push([id, (Date.now() - l0) / 1000]);
    if (!res.ok) { console.log(`${mode}: FAILED at lesson ${id}, step ${res.failed}`); process.exit(1); }
    steps += Object.keys(res.steps).length;
    if (verify) {
      const rec = readEvidence(id);
      if (!rec) { console.log(`DIFF ${id}: no recorded evidence`); diffs++; continue; }
      for (const s of res.def.steps) {
        if (s.noOutput) continue;
        const a = applyMasks(rec[s.id] || '', s.mask), b = applyMasks(res.steps[s.id].output, s.mask);
        if (a !== b) {
          diffs++;
          const al = a.split('\n'), bl = b.split('\n');
          let i = 0; while (i < al.length && al[i] === bl[i]) i++;
          console.log(`DIFF ${id}/${s.id}: line ${i + 1}: recorded "${(al[i] || '').slice(0, 100)}" now "${(bl[i] || '').slice(0, 100)}"`);
        }
      }
    } else writeEvidence(id, res);
  }
  const total = (Date.now() - t0) / 1000;
  const summary = `${mode}: ${times.length} lessons, ${steps} steps, ${total.toFixed(0)} s in total (${(total / 60).toFixed(1)} min)` + (verify ? `; differences: ${diffs}` : '');
  console.log(summary);
  const report = [`# ${mode} run ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}`, summary, '', ...times.map(([i, s]) => `lesson ${i}: ${s.toFixed(1)} s`), ''].join('\n');
  fs.writeFileSync(path.join(EVIDENCE, verify ? '_verify.txt' : '_run.txt'), report);
  process.exit(diffs ? 1 : 0);
} else {
  console.log('usage: runner.js lesson <id> | path | verify');
  process.exit(2);
}
