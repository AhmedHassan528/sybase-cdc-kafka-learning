// Check (FR-009): print style. With print media emulated at A4 width, controls are hidden, no code block is cut off
// (every <pre> wraps and fits its box), and the browser can render the page to PDF. A physical printer was not run.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { launch, fileUrl, CHROME } = require('./browser');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  console.log(`print: print media at A4 width (browser ${CHROME})`);
  const browser = await launch();
  try {
    for (const rel of ['index.html', 'guide/03-transaction-buffer.html']) {
      const page = await browser.newPage();
      await page.emulateMediaType('print');
      await page.setViewport({ width: 794, height: 1123 });
      await page.goto(fileUrl(rel), { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const shown = sel => [...document.querySelectorAll(sel)].some(e => getComputedStyle(e).display !== 'none');
        const pres = [...document.querySelectorAll('.prose-site pre')];
        return {
          hidden: { header: !shown('.site-header'), contents: !shown('.contents-side'), pn: !shown('.pn'), copy: !shown('.copy-btn'), footer: !shown('.site-footer') },
          pres: pres.length,
          wrapping: pres.filter(p => getComputedStyle(p).whiteSpace === 'pre-wrap').length,
          cutOff: pres.filter(p => p.scrollWidth > p.clientWidth + 1).length,
          pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          color: getComputedStyle(document.body).color, bg: getComputedStyle(document.body).backgroundColor,
        };
      });
      const allHidden = Object.values(r.hidden).every(Boolean);
      ok(allHidden, `${rel}: header, contents, previous/next, copy buttons and footer hidden in print (${JSON.stringify(r.hidden)})`);
      ok(r.wrapping === r.pres && r.cutOff === 0, `${rel}: ${r.pres} code blocks, ${r.wrapping} wrap, ${r.cutOff} cut off`);
      ok(!r.pageOverflow && r.color === 'rgb(0, 0, 0)' && r.bg === 'rgb(255, 255, 255)', `${rel}: no horizontal overflow, text ${r.color} on ${r.bg}`);
      const pdf = path.join(os.tmpdir(), 'site-print-check.pdf');
      await page.pdf({ path: pdf, format: 'A4', printBackground: true });
      const buf = fs.readFileSync(pdf);
      const pagesInPdf = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      ok(buf.length > 10000 && pagesInPdf > 0, `${rel}: PDF rendered, ${(buf.length / 1024).toFixed(0)} KB, ${pagesInPdf} pages`);
      fs.rmSync(pdf, { force: true });
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(`failures: ${fails}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
