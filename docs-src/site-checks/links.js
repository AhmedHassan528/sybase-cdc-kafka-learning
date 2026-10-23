// Check (FR-007, SC-003): every href/src and #anchor in docs/site resolves; ids are unique per page.
const { fs, path, SITE, pages } = require('./common');
const list = pages();
console.log('links: every local link and anchor in docs/site');
if (!list.length) { console.log('FAIL no pages under docs/site (run: node docs-src/build.js site)'); process.exit(1); }
const idsOf = new Map();
const ids = f => {
  if (!idsOf.has(f)) idsOf.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  return idsOf.get(f);
};
let bad = 0, checked = 0;
const external = new Set();
for (const rel of list) {
  const file = path.join(SITE, rel), html = fs.readFileSync(file, 'utf8');
  const all = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = [...new Set(all.filter((x, i) => all.indexOf(x) !== i))];
  if (dup.length) { console.log(`DUPLICATE IDS ${rel}: ${dup.join(' ')}`); bad++; }
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:)/.test(u)) { external.add(u); continue; }
    if (u === '') continue;
    checked++;
    const [f, frag] = u.split('#');
    const target = f ? path.resolve(path.dirname(file), decodeURIComponent(f)) : file;
    if (!fs.existsSync(target)) { console.log(`MISSING FILE ${rel} -> ${u}`); bad++; continue; }
    if (frag && target.endsWith('.html') && !ids(target).has(frag)) { console.log(`MISSING ANCHOR ${rel} -> ${u}`); bad++; }
  }
}
console.log(`pages=${list.length} local links checked=${checked} problems=${bad} external=${external.size}`);
process.exit(bad ? 1 : 0);
