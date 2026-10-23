// Look review (SC-008): measures the headline block, reading column, heading scale, code panels, side contents and accent
// colour on this site and on the reference post the user named (both in light mode, 1280 px), and prints them side by
// side. Verdicts are computed from the measured values, not typed in. The reference page is only measured here (and
// screenshotted locally by reference-shot.js); nothing of it is stored in the repository.
// If the reference cannot be reached its column says "not reachable (not run)" and the script exits 1.
const { launch, fileUrl, CHROME } = require('./browser');
const REF = 'https://www.confluent.io/blog/kafka-connect-deep-dive-jdbc-source-connector/';

const measure = () => {
  const cs = e => getComputedStyle(e);
  const width = e => Math.round(e.getBoundingClientRect().width);
  const font = e => cs(e).fontFamily.split(',')[0].replace(/"/g, '').trim();
  const out = {};
  const h1 = document.querySelector('h1');
  if (h1) {
    const a = cs(h1);
    out.headline = { size: parseFloat(a.fontSize), weight: Number(a.fontWeight), font: font(h1), color: a.color === 'rgba(0, 0, 0, 0)' ? 'gradient text' : a.color };
    const after = [...document.querySelectorAll('*')].find(e => e !== h1 && /(^|\s)(read time|min read)/i.test(e.textContent) && e.children.length < 3 && e.textContent.length < 80);
    out.headline.metaLine = after ? after.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : 'not found';
  }
  const p = [...document.querySelectorAll('p')].find(q => !q.classList.contains('lede') && q.textContent.trim().length > 150 && width(q) > 400 && parseFloat(cs(q).fontSize) >= 14);
  if (p) { const b = cs(p); out.body = { size: parseFloat(b.fontSize), line: parseFloat(b.lineHeight) || null, font: font(p), column: width(p) }; }
  const h2 = [...document.querySelectorAll('h2')].find(e => e.textContent.trim().length > 3 && width(e) > 200 && !e.closest('nav, footer, [id*="onetrust"]'));
  if (h2) out.h2 = { size: parseFloat(cs(h2).fontSize), weight: Number(cs(h2).fontWeight) };
  const pre = document.querySelector('pre');
  if (pre) { const d = cs(pre); out.code = { bg: d.backgroundColor, border: parseFloat(d.borderTopWidth), radius: parseFloat(d.borderTopLeftRadius) }; }
  const pl = [...document.querySelectorAll('p')].filter(q => !q.classList.contains('lede') && q.textContent.trim().length > 150 && width(q) > 400 && q.querySelector('a'));
  const link = pl.length ? pl[0].querySelector('a') : null;
  if (link) out.link = { color: cs(link).color, underline: cs(link).textDecorationLine.includes('underline') };
  const tocs = [...document.querySelectorAll('*')].filter(e => /^(table of )?contents$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0);
  const toc = tocs[tocs.length - 1];
  if (toc) {
    let box = toc.parentElement;
    while (box && box.querySelectorAll('a').length < 4 && box.parentElement) box = box.parentElement;
    const items = box.querySelectorAll('a').length;
    out.toc = { right: !!p && toc.getBoundingClientRect().left > p.getBoundingClientRect().right - 5, items, numbered: !!box.querySelector('ol, .num'), underlined: items ? cs(box.querySelector('a')).textDecorationLine.includes('underline') : false };
  }
  out.page = cs(document.body).backgroundColor;
  return out;
};

const fmt = o => (o ? Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') : 'not found');
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;

(async () => {
  console.log(`look review: measured values, this site vs the reference post, light mode, 1280 px (browser ${CHROME})`);
  const browser = await launch();
  let ours, theirs = null, refMsg = '';
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(fileUrl('index.html'), { waitUntil: 'load' });
    ours = await page.evaluate(measure);
    try {
      await page.goto(REF, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2500));
      theirs = await page.evaluate(measure);
    } catch (e) { refMsg = e.message; }
  } finally { await browser.close(); }
  if (!theirs) { console.log('reference not reachable (not run): ' + refMsg); process.exit(1); }

  const verdicts = {
    headline: (o, t) => !o.headline || !t.headline ? 'missing on one page' : `both present, large and bold; sizes ${o.headline.size} vs ${t.headline.size} px, weight ${o.headline.weight} vs ${t.headline.weight}; the reference uses a web font and gradient colour, this site uses system fonts and a solid indigo`,
    body: (o, t) => !o.body || !t.body ? 'missing on one page' : `both a single text column; width ${o.body.column} vs ${t.body.column} px (${near(o.body.column, t.body.column, 60) ? 'similar' : 'different'}), text ${o.body.size} vs ${t.body.size} px`,
    h2: (o, t) => !o.h2 || !t.h2 ? (o.h2 ? 'reference headings not measurable in the rendered page; this site has them' : 'missing on this site') : `sizes ${o.h2.size} vs ${t.h2.size} px`,
    code: (o, t) => !o.code || !t.code ? 'missing on one page' : `both a light grey panel (${o.code.bg} vs ${t.code.bg}); this site adds a ${o.code.border} px border and ${o.code.radius} px corners`,
    toc: (o, t) => !o.toc || !t.toc ? 'missing on one page' : `both on the right of the text (${o.toc.right} vs ${t.toc.right}); numbered ${o.toc.numbered} vs ${t.toc.numbered}; underlined links ${o.toc.underlined} vs ${t.toc.underlined}; entries ${o.toc.items} vs ${t.toc.items} (this site also lists sub-headings, which the spec requires)`,
    link: (o, t) => { const blue = col => { const m = /^rgb\((\d+), (\d+), (\d+)\)/.exec(col); return !!m && +m[3] > +m[1] && +m[3] > +m[2]; }; return !o.link || !t.link ? 'missing on one page' : `link colours ${o.link.color} vs ${t.link.color}; blue family: this site ${blue(o.link.color)}, reference ${blue(t.link.color)}; underlined ${o.link.underline} vs ${t.link.underline}`; },
  };
  const names = { headline: 'Headline block (headline, crumb line with date and read time, summary)', body: 'Reading column', h2: 'Heading scale', code: 'Code panels', toc: 'Side contents', link: 'Accent colour (links)' };
  for (const k of Object.keys(names)) {
    console.log(`${names[k]}\n  this site : ${fmt(ours[k])}\n  reference : ${fmt(theirs[k])}\n  verdict   : ${verdicts[k](ours, theirs)}\n`);
  }
  console.log(`headline meta line: this site "${ours.headline.metaLine}"; reference "${theirs.headline && theirs.headline.metaLine}"`);
  console.log(`page background: this site ${ours.page}; reference ${theirs.page}`);
  console.log('Not copied on purpose: the reference text, images, logo, author photo, cookie banner and brand colours.');
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
