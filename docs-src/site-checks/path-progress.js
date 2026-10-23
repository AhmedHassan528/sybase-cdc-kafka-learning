// Check (SC-007, FR-017, FR-018): progress on the learning path.
//   1 mark three lessons complete, reload the overview: three marks, the count and the bar agree, the stage count follows
//   2 open a later lesson directly: its prerequisites show done or open, and nothing blocks reading it
//   3 storage blocked: every lesson still reads and the page says that progress cannot be remembered
//   node docs-src/site-checks/path-progress.js          (BROWSER=edge for Microsoft Edge)
const { launch, fileUrl, CHROME } = require('./browser');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log(`path-progress: marks, counts, prerequisites, blocked storage (browser ${CHROME})`);
  const browser = await launch();
  try {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.goto(fileUrl('path/index.html'));
    const lessons = await page.$$eval('.lesson-list li', li => li.map(l => ({ id: l.dataset.lesson, href: l.querySelector('a').href })));
    const total = lessons.length;
    ok(total > 3, `the overview lists ${total} lessons`);
    ok((await page.$eval('.path-progress .label', e => e.textContent)).startsWith('0 of ' + total), 'nothing is complete at first');

    const marked = lessons.slice(0, 3);
    for (const l of marked) {
      await page.goto(l.href);
      await page.click('.complete-btn');
      const pressed = await page.$eval('.complete-btn', b => b.getAttribute('aria-pressed'));
      ok(pressed === 'true', `lesson ${l.id}: the button shows the lesson as complete`);
    }
    await page.goto(fileUrl('path/index.html'));
    await page.reload();
    const done = await page.$$eval('.lesson-list li.done', li => li.map(l => l.dataset.lesson));
    ok(JSON.stringify(done) === JSON.stringify(marked.map(l => l.id)), `after a reload the overview marks exactly ${marked.map(l => l.id).join(', ')} (found ${done.join(', ')})`);
    ok((await page.$eval('.path-progress .label', e => e.textContent)).startsWith('3 of ' + total), 'the overall count says 3 of ' + total);
    const widthPct = await page.$eval('.path-progress .bar > span', e => parseFloat(e.style.width));
    ok(Math.abs(widthPct - 300 / total) < 1, `the bar is ${widthPct.toFixed(1)} % wide (expected ${(300 / total).toFixed(1)} %)`);
    const stageCounts = await page.$$eval('.stage-count', e => e.map(x => x.textContent));
    ok(stageCounts.some(t => /^[1-9] of /.test(t)), 'a stage count shows the completed lessons: ' + stageCounts.join(' | '));
    const cont = await page.$eval('.continue-btn', a => ({ href: a.href, text: a.textContent }));
    ok(cont.href === lessons[3].href, `the continue link goes to the first unfinished lesson (${lessons[3].id}): "${cont.text}"`);

    // a later lesson opened directly
    const later = lessons.find(l => l.id === '4.2');
    await page.goto(later.href);
    const prereqs = await page.$$eval('.prereq-list li', li => li.map(l => ({ id: l.dataset.prereq, status: l.querySelector('.pstatus').textContent.trim() })));
    ok(prereqs.length > 0 && prereqs.every(p => /done|open/i.test(p.status)), 'lesson 4.2 shows a status for each prerequisite: ' + JSON.stringify(prereqs));
    const visible = await page.$eval('#article', a => a.getBoundingClientRect().height > 200 && getComputedStyle(a).visibility !== 'hidden');
    ok(visible, 'the lesson opened directly can be read');
    await ctx.close();

    // storage blocked
    const ctx2 = await browser.createBrowserContext();
    const p2 = await ctx2.newPage();
    await p2.evaluateOnNewDocument(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    const errors = [];
    p2.on('pageerror', e => errors.push(e.message));
    await p2.goto(fileUrl('path/index.html'));
    await sleep(300);
    ok(errors.length === 0, 'no script error on the overview with storage blocked' + (errors.length ? ': ' + errors[0] : ''));
    await p2.goto(later.href);
    await sleep(300);
    const note = await p2.$eval('.storage-note', n => ({ shown: !n.hidden && getComputedStyle(n).display !== 'none', text: n.textContent.trim() })).catch(() => null);
    ok(note && note.shown && /cannot|not be remembered|can.t/i.test(note.text), 'the lesson says progress cannot be remembered: ' + (note && note.text));
    const readable = await p2.$eval('#article', a => a.innerText.length > 500);
    ok(readable && errors.length === 0, 'the lesson still reads with storage blocked');
    await p2.click('.complete-btn').catch(() => {});
    ok(errors.length === 0, 'clicking "Mark this lesson complete" with storage blocked raises no error');
    await ctx2.close();
  } finally { await browser.close(); }
  console.log(fails ? `path-progress: ${fails} problem(s)` : 'path-progress: all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
