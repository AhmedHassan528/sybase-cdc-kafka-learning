// Local-only helper for the look review (SC-008): saves screenshots of the reference post named by the user.
// Output goes to docs/evidence/site-look/reference-*.png, which .gitignore excludes. Nothing of the page is committed.
//   node docs-src/site-checks/reference-shot.js
const { launch } = require('./browser');
const { path, ROOT } = require('./common');
const fs = require('fs');
const URL = 'https://www.confluent.io/blog/kafka-connect-deep-dive-jdbc-source-connector/';
const out = path.join(ROOT, 'docs', 'evidence', 'site-look');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await launch();
  try {
    for (const [name, w, h] of [['reference-1280.png', 1280, 900], ['reference-375.png', 375, 800]]) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h });
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto:', e.message));
      await new Promise(r => setTimeout(r, 2500));
      // Dismiss nothing and accept nothing: only the first screen as loaded is captured.
      await page.screenshot({ path: path.join(out, name) });
      const info = await page.evaluate(() => {
        const q = s => document.querySelector(s);
        const h1 = q('h1'), p = q('article p, .post-content p, main p');
        const cs = e => e ? getComputedStyle(e) : null;
        const a = cs(h1), b = cs(p);
        return { title: document.title, h1: h1 ? { size: a.fontSize, weight: a.fontWeight, family: a.fontFamily.slice(0, 60) } : null, p: p ? { size: b.fontSize, line: b.lineHeight, width: Math.round(p.getBoundingClientRect().width), family: b.fontFamily.slice(0, 60), color: b.color } : null, bg: getComputedStyle(document.body).backgroundColor };
      });
      console.log(name, JSON.stringify(info));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
