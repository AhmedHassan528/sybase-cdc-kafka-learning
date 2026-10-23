// Check (SC-004, FR-011): every page loads with every request that is not a local file blocked and counted.
// Fails on any attempted outside request, any failed local resource, any image that did not load, and any console error.
const { launch, fileUrl, CHROME, pages } = require('./browser');

(async () => {
  console.log(`offline: loading every page with outside requests blocked (browser ${CHROME})`);
  const list = pages();
  if (!list.length) { console.log('FAIL no pages under docs/site'); process.exit(1); }
  const browser = await launch();
  let bad = 0, requests = 0, outside = 0;
  try {
    for (const rel of list) {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      const seen = { local: 0, outside: [], failed: [], errors: [] };
      page.on('request', r => {
        const u = r.url();
        if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('about:') || u.startsWith('blob:')) { seen.local++; r.continue(); }
        else { seen.outside.push(u); r.abort('blockedbyclient'); }
      });
      page.on('requestfailed', r => { if (r.url().startsWith('file:')) seen.failed.push(r.url()); });
      page.on('pageerror', e => seen.errors.push(String(e.message || e)));
      page.on('console', m => { if (m.type() === 'error') seen.errors.push(m.text()); });
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(fileUrl(rel), { waitUntil: 'load' });
      // Scroll to the bottom so lazy images are requested too.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
      await new Promise(r => setTimeout(r, 300));
      const imgs = await page.evaluate(() => [...document.images].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
      const brokenImgs = imgs.filter(i => !i.ok);
      const cssLoaded = await page.evaluate(() => [...document.styleSheets].length > 0);
      const ok = !seen.outside.length && !seen.failed.length && !brokenImgs.length && !seen.errors.length && cssLoaded;
      requests += seen.local; outside += seen.outside.length;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${rel.padEnd(34)} local requests=${String(seen.local).padStart(2)} outside=${seen.outside.length} failed=${seen.failed.length} images=${imgs.length} broken=${brokenImgs.length} script-errors=${seen.errors.length} stylesheet=${cssLoaded}` +
        (ok ? '' : ` ${JSON.stringify({ outside: seen.outside.slice(0, 3), failed: seen.failed.slice(0, 3), broken: brokenImgs.slice(0, 3), errors: seen.errors.slice(0, 3) })}`));
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(`pages: ${list.length}; local requests: ${requests}; outside requests attempted: ${outside}; pages with problems: ${bad}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
