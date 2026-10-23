// Check (plan: size budgets): article page under 400 KB, stylesheet under 60 KB, script under 30 KB. Sizes are measured, not promised.
const { fs, path, SITE } = require('./common');
const BUDGETS = [['index.html', 400], ['assets/site.css', 60], ['assets/site.js', 30]];
let fails = 0;
console.log('sizes: budgets from specs/002-article-website/plan.md');
for (const [f, kb] of BUDGETS) {
  const size = fs.statSync(path.join(SITE, f)).size;
  const ok = size <= kb * 1024;
  if (!ok) fails++;
  console.log(`${ok ? 'ok   ' : 'FAIL '}${f.padEnd(18)} ${(size / 1024).toFixed(1)} KB (budget ${kb} KB)`);
}
const total = (function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? walk(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0); })(SITE);
console.log(`whole docs/site folder: ${(total / 1024).toFixed(1)} KB`);
process.exit(fails ? 1 : 0);
