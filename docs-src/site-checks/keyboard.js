// Check (SC-005, FR-010): the six reader actions work with key events only (Tab, Enter, Space, arrows), no mouse:
//   1 open the contents menu   2 run a search   3 switch the theme   4 copy a code block   5 open a check question   6 follow "next"
// Also checks the edge cases of the spec: a failing clipboard says "Copy failed", scripts off still shows text and links,
// and a link with a #heading lands on that heading with the contents item marked.
//   node docs-src/site-checks/keyboard.js
const { launch, fileUrl, CHROME } = require('./browser');
let fails = 0, actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = (c, m, isAction) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; else if (isAction) actions++; };

// Press Tab until the focused element matches the selector (max presses). Returns how many presses it took, or -1.
async function tabTo(page, selector, max = 1500) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(s => document.activeElement && document.activeElement.matches(s), selector)) return i;
  }
  return -1;
}
// Fake clipboard recorded on the page; mode 'ok' resolves, 'fail' rejects and makes execCommand fail too.
const clipboardStub = mode => `(() => {
  window.__copied = null;
  const w = { writeText: t => { window.__copied = t; return ${mode === 'ok' ? 'Promise.resolve()' : 'Promise.reject(new Error("denied"))'}; } };
  Object.defineProperty(navigator, 'clipboard', { value: w, configurable: true });
  ${mode === 'ok' ? '' : 'document.execCommand = () => false;'}
})();`;

(async () => {
  console.log(`keyboard: six actions with keys only, plus edge cases (browser ${CHROME})`);
  const browser = await launch();
  try {
    // 1. Contents menu on a narrow window.
    let page = await browser.newPage();
    await page.setViewport({ width: 375, height: 800 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    let n = await tabTo(page, '#ui-contents > summary');
    ok(n > 0, `1 contents: reached the Contents summary after ${n} Tab presses`);
    await page.keyboard.press('Enter');
    ok(await page.evaluate(() => document.getElementById('ui-contents').open), '1 contents: Enter opens the menu', true);
    n = await tabTo(page, '#ui-contents a');
    await page.keyboard.press('Enter'); await sleep(700);
    const h1 = await page.evaluate(() => ({ hash: location.hash, open: document.getElementById('ui-contents').open }));
    ok(/^#.+/.test(h1.hash) && !h1.open, `1 contents: Enter on an entry goes to ${h1.hash} and closes the menu`);
    await page.close();

    // 2. Search, 3. theme, 4. copy, 5. check question, 6. next, on a wide window.
    page = await browser.newPage();
    await page.evaluateOnNewDocument(clipboardStub('ok'));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });

    n = await tabTo(page, '#ui-search');
    ok(n > 0, `2 search: reached the search box after ${n} Tab presses`);
    await page.keyboard.type('tombstone');
    await sleep(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); await sleep(800);
    ok(await page.evaluate(() => location.hash) === '#keys-delete', `2 search: typing, ArrowDown, Enter lands on ${await page.evaluate(() => location.hash)}`, true);

    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    n = await tabTo(page, '#ui-theme');
    const before = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), pressed: document.getElementById('ui-theme').getAttribute('aria-pressed') }));
    await page.keyboard.press('Enter'); await sleep(200);
    const after = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), pressed: document.getElementById('ui-theme').getAttribute('aria-pressed') }));
    ok(n > 0 && after.dark !== before.dark && after.pressed !== before.pressed, `3 theme: Enter toggles dark ${before.dark} -> ${after.dark}, aria-pressed ${before.pressed} -> ${after.pressed}`, true);

    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    n = await tabTo(page, '.copy-btn');
    await page.keyboard.press('Enter'); await sleep(300);
    const cp = await page.evaluate(() => {
      const b = document.activeElement; const pre = b.parentElement.querySelector('pre');
      return { label: b.textContent, copied: window.__copied, expected: pre.textContent };
    });
    ok(n > 0 && cp.label === 'Copied' && cp.copied === cp.expected, `4 copy: Enter copies exactly the block text (${cp.expected.length} characters), button says "${cp.label}"`, true);

    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    n = await tabTo(page, 'details.check > summary');
    await page.keyboard.press('Space'); await sleep(150);
    ok(n > 0 && await page.evaluate(() => document.activeElement.parentElement.open), `5 check question: Space opens the answer (after ${n} Tab presses)`, true);

    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    const nextHref = await page.$eval('.pn-next', a => a.getAttribute('href'));
    n = await tabTo(page, '.pn-next');
    await page.keyboard.press('Enter'); await sleep(900);
    const top = await page.evaluate(id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : null; }, nextHref.slice(1));
    ok(n > 0 && await page.evaluate(() => location.hash) === nextHref && top > 0 && top < 400, `6 next: Enter goes to ${nextHref} and the heading is in view (top ${Math.round(top)} px)`, true);
    await page.close();

    ok(actions === 6, `keyboard-only actions passed: ${actions} of 6`);

    // Edge case: clipboard denied.
    page = await browser.newPage();
    await page.evaluateOnNewDocument(clipboardStub('fail'));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    await tabTo(page, '.copy-btn');
    await page.keyboard.press('Enter'); await sleep(300);
    const failLabel = await page.evaluate(() => (document.activeElement.className.includes('copy-btn') ? document.activeElement.textContent : 'focus lost: ' + document.activeElement.tagName));
    const selectable = await page.evaluate(() => getComputedStyle(document.querySelector('.prose-site pre')).userSelect !== 'none');
    ok(failLabel === 'Copy failed' && selectable, `edge: clipboard denied shows "${failLabel}" and the code stays selectable`);
    await page.close();

    // Edge case: scripts disabled.
    page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    const nojs = await page.evaluate(() => ({
      noJsClass: document.documentElement.classList.contains('no-js'),
      words: document.querySelector('#article').textContent.trim().split(/\s+/).length,
      links: document.querySelectorAll('.contents-wide a[href^="#"]').length,
      pn: document.querySelectorAll('.pn a').length,
      hiddenControls: [...document.querySelectorAll('.js-only')].every(e => getComputedStyle(e).display === 'none'),
    }));
    ok(nojs.noJsClass && nojs.words > 5000 && nojs.links >= 90 && nojs.pn >= 24 && nojs.hiddenControls,
      `edge: scripts off: article text present (${nojs.words} words), ${nojs.links} contents links, ${nojs.pn} previous/next links, script-only controls hidden=${nojs.hiddenControls}`);
    await page.close();

    // Edge case: a bookmarked heading link.
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html') + '#rel-rollback', { waitUntil: 'load' });
    await sleep(1500);
    const bm = await page.evaluate(() => ({ top: document.getElementById('rel-rollback').getBoundingClientRect().top, cur: (document.querySelector('.contents-wide a[aria-current="true"]') || {}).textContent }));
    ok(bm.top > 0 && bm.top < 300 && /rolled-back/i.test(bm.cur || ''), `edge: #rel-rollback lands in view (top ${Math.round(bm.top)} px) with "${bm.cur}" marked in the contents`);
    await page.close();
  } finally { await browser.close(); }
  console.log(`failures: ${fails}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
