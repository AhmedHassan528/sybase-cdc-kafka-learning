// Check (SC-002): no page needs horizontal page scrolling at 320, 375, 768 and 1280 px, in both themes.
// Wide code blocks and tables must scroll inside their own box (overflow auto or scroll), never widen the page.
//   node docs-src/site-checks/overflow.js [--theme=light|dark|both]
const { launch, fileUrl, CHROME, pages } = require('./browser');
const WIDTHS = [320, 375, 768, 1280];
const arg = (process.argv.find(a => a.startsWith('--theme=')) || '--theme=both').split('=')[1];
const THEMES = arg === 'both' ? ['light', 'dark'] : [arg];

(async () => {
  console.log(`overflow: page-level horizontal scroll at ${WIDTHS.join(', ')} px, themes: ${THEMES.join(', ')} (browser ${CHROME})`);
  const list = pages();
  if (!list.length) { console.log('FAIL no pages under docs/site'); process.exit(1); }
  const browser = await launch();
  let bad = 0, checks = 0;
  try {
    for (const theme of THEMES) for (const rel of list) {
      const page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      for (const w of WIDTHS) {
        await page.setViewport({ width: w, height: 900 });
        await page.goto(fileUrl(rel), { waitUntil: 'load' });
        const r = await page.evaluate(() => {
          const de = document.documentElement, vw = de.clientWidth;
          const boxes = [...document.querySelectorAll('pre, .tbl')];
          const inBox = el => !!el.closest('pre, .tbl');
          const offenders = [...document.querySelectorAll('body *')]
            .filter(el => !inBox(el) && el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== 'fixed')
            .slice(0, 5).map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
          const badBoxes = boxes.filter(b => !['auto', 'scroll'].includes(getComputedStyle(b).overflowX)).length;
          const scrolling = boxes.filter(b => b.scrollWidth > b.clientWidth + 1).length;
          return { scrollWidth: de.scrollWidth, vw, offenders, badBoxes, scrolling, boxes: boxes.length, dark: de.classList.contains('dark') };
        });
        checks++;
        const ok = r.scrollWidth <= r.vw && r.badBoxes === 0 && r.dark === (theme === 'dark');
        if (!ok) bad++;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${theme.padEnd(5)} ${String(w).padStart(4)} px  ${rel.padEnd(34)} scrollWidth=${r.scrollWidth} viewport=${r.vw} boxes=${r.boxes} scrolling-inside=${r.scrolling}` +
          (ok ? '' : ` offenders=${JSON.stringify(r.offenders)} boxes-without-own-scroll=${r.badBoxes} dark-class=${r.dark}`));
      }
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(`checked ${checks} page/width/theme combinations; failures: ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
