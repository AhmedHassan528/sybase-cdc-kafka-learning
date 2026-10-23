// Check (SC-007, FR-012): building the site twice from the same sources gives byte-identical files.
const cp = require('child_process');
const crypto = require('crypto');
const { fs, path, ROOT, SITE } = require('./common');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
function snapshot() {
  const o = {};
  for (const f of walk(SITE).sort()) o[path.relative(SITE, f).split(path.sep).join('/')] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  return o;
}
const build = () => cp.execFileSync(process.execPath, [path.join(ROOT, 'docs-src', 'build.js'), 'site'], { encoding: 'utf8' }).trim();

console.log('reproducible: two builds from the same sources');
const l1 = build(); const a = snapshot();
const l2 = build(); const b = snapshot();
console.log('build 1: ' + l1);
console.log('build 2: ' + l2);
const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
let diff = 0;
for (const n of names) if (a[n] !== b[n]) { diff++; console.log('DIFF ' + n); }
const total = crypto.createHash('sha256').update(names.map(n => n + a[n]).join('\n')).digest('hex');
console.log(`${names.length} files compared; differing: ${diff}; combined sha256 of build 1: ${total}`);
process.exit(diff ? 1 : 0);
