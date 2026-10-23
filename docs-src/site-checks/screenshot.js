// Takes screenshots of a built page for the look review (SC-008) and for visual debugging.
//   node docs-src/site-checks/screenshot.js <page> <width> <out.png> [--dark] [--full] [--hash=<anchor>] [--height=<px>]
const { launch, fileUrl } = require('./browser');
const a = process.argv.slice(2);
const [rel, width, out] = a;
const flag = n => a.find(x => x.startsWith('--' + n + '='));
(async () => {
  if (!rel || !width || !out) { console.log('usage: screenshot.js <page> <width> <out.png> [--dark] [--full] [--hash=id] [--height=px]'); process.exit(2); }
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: a.includes('--dark') ? 'dark' : 'light' }]);
    await page.setViewport({ width: Number(width), height: Number((flag('height') || '--height=900').split('=')[1]) });
    const hash = flag('hash');
    await page.goto(fileUrl(rel) + (hash ? '#' + hash.split('=')[1] : ''), { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1500)); await page.screenshot({ path: out, fullPage: a.includes('--full') });
    console.log('saved', out);
  } finally { await browser.close(); }
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
