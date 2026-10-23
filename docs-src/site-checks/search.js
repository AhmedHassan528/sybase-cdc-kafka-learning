// Check (SC-001, FR-006): search finds known terms and lands on the section that contains them; a nonsense term shows
// "Nothing found"; every one of the 12 contents entries scrolls its section into view with one click.
const { launch, fileUrl, CHROME } = require('./browser');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// term -> id of a heading that must rank first, or null when only "some result whose section contains the term" is required
const TERMS = [['oqid', null, null], ['retry timeout', null, null], ['tombstone', 'keys-delete', null], ['TransactionBuffer', null, 'guide/']];

(async () => {
  console.log(`search: results, empty result and contents clicks (browser ${CHROME})`);
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });

    for (const [term, expectFirst, expectPage] of TERMS) {
      await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
      await page.click('#ui-search');
      await page.type('#ui-search', term);
      await page.waitForSelector('#ui-results a', { timeout: 3000 }).catch(() => null);
      const res = await page.$$eval('#ui-results a', as => as.map(a => ({ href: a.getAttribute('href'), head: (a.querySelector('.r-head') || a).textContent })));
      ok(res.length > 0, `"${term}": ${res.length} result(s)`);
      if (!res.length) continue;
      const anchor = res[0].href.split('#')[1];
      if (expectFirst) ok(anchor === expectFirst, `"${term}": first result is #${anchor} (expected #${expectFirst})`);
      if (expectPage) {
        await page.keyboard.press('Enter');
        await sleep(900);
        const where = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, found: !!document.getElementById(location.hash.slice(1)) }));
        ok(where.path.includes(expectPage) && where.found, `"${term}": Enter opens ${where.path}${where.hash} and the heading exists`);
        continue;
      }
      // The section the first result points at must contain the term (independent of the search index).
      const has = await page.evaluate((id, t) => {
        const h = document.getElementById(id); if (!h) return 'no such heading';
        let txt = h.textContent, n = h.nextElementSibling;
        while (n && !/^H[23]$/.test(n.tagName) && !n.querySelector('h2,h3')) { txt += ' ' + n.textContent; n = n.nextElementSibling; }
        return txt.toLowerCase().includes(t.toLowerCase().split(' ')[0]);
      }, anchor, term);
      ok(has === true, `"${term}": the target section #${anchor} contains the term${has === true ? '' : ' (' + has + ')'}`);
      await page.keyboard.press('Enter');
      await sleep(900);
      const hash = await page.evaluate(() => location.hash);
      ok(hash === '#' + anchor, `"${term}": Enter lands on #${anchor} (location hash ${hash})`);
    }

    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    await page.click('#ui-search');
    await page.type('#ui-search', 'zzqxvv');
    await sleep(400);
    const none = await page.$eval('#ui-results', el => el.textContent);
    ok(/Nothing found for zzqxvv/.test(none), `nonsense term shows: "${none.trim()}"`);

    // One click on each of the 12 contents entries brings the section heading into view.
    const count = await page.$$eval('.contents-wide .lvl2 a', a => a.length);
    ok(count === 12, `contents lists ${count} sections`);
    for (let i = 0; i < count; i++) {
      await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
      const id = await page.$$eval('.contents-wide .lvl2 a', (a, k) => a[k].getAttribute('href').slice(1), i);
      const handle = (await page.$$('.contents-wide .lvl2 a'))[i];
      await handle.click();
      let top = null;
      for (let t = 0; t < 30; t++) { await sleep(150); top = await page.$eval('#' + id, el => el.getBoundingClientRect().top); if (top > 0 && top < 400) break; }
      ok(top > 0 && top < 400, `contents entry ${i + 1} (#${id}): heading in view (top ${Math.round(top)} px)`);
    }
  } finally { await browser.close(); }
  console.log(`failures: ${fails}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
