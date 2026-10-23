// Check (FR-010): colour contrast of the theme token pairs in both themes (4.5:1 for text), plus page structure basics:
// lang, one h1, landmarks, skip link, alt text, names on buttons and inputs. Static checks only; a screen reader was not run.
const { fs, path, ROOT, SITE, pages } = require('./common');
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m); };

const css = fs.readFileSync(path.join(ROOT, 'docs-src', 'site', 'styles', 'site.css'), 'utf8');
function vars(selectorRe) {
  const m = css.match(selectorRe);
  const o = {};
  if (m) for (const v of m[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) o[v[1]] = v[2];
  return o;
}
const light = vars(/:root\s*\{([\s\S]*?)\}/);
const dark = { ...light, ...vars(/html\.dark\s*\{([\s\S]*?)\}/) };
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// text colour on background colour, as used in site.css
const PAIRS = [['ink', 'page'], ['mute', 'page'], ['ink', 'panel'], ['mute', 'panel'], ['ink', 'soft'], ['mute', 'soft'], ['accent', 'page'], ['accent', 'soft'], ['accent', 'panel'], ['page', 'accent']];

console.log('contrast: text colour pairs from docs-src/site/styles/site.css (minimum 4.5:1)');
for (const [name, t] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg] of PAIRS) {
    if (!t[fg] || !t[bg]) { ok(false, `${name}: --${fg} or --${bg} not found`); continue; }
    const r = ratio(t[fg], t[bg]);
    ok(r >= 4.5, `${name.padEnd(5)} ${fg.padEnd(6)} on ${bg.padEnd(6)} ${t[fg]} / ${t[bg]} = ${r.toFixed(2)}:1`);
  }
}

console.log('structure: every page');
for (const rel of pages()) {
  const h = fs.readFileSync(path.join(SITE, rel), 'utf8');
  const problems = [];
  if (!/<html lang="en"/.test(h)) problems.push('no lang');
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${(h.match(/<h1[\s>]/g) || []).length} h1`);
  for (const lm of ['<header', '<nav', '<main', '<footer']) if (!h.includes(lm)) problems.push('no ' + lm.slice(1));
  if (!/<a class="skip" href="#main"/.test(h) || !/<main id="main"/.test(h)) problems.push('skip link');
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="[^"]+"/.test(m[0])) problems.push('img without alt');
  for (const m of h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) if (!/aria-label="[^"]+"/.test(m[0]) && !m[1].replace(/<[^>]+>/g, '').trim()) problems.push('button without name');
  for (const m of h.matchAll(/<input\b[^>]*>/g)) if (!/id="([^"]+)"/.test(m[0]) || !h.includes('for="' + (m[0].match(/id="([^"]+)"/) || [])[1] + '"')) problems.push('input without label');
  ok(!problems.length, `${rel.padEnd(34)} ${problems.length ? problems.join(', ') : 'lang, one h1, landmarks, skip link, alt text, button and input names'}`);
}
console.log(`failures: ${fails}`);
process.exit(fails ? 1 : 0);
