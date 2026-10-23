// Takes a screenshot of the running lab's Kafka web UI (http://localhost:8080) for a learning path lesson and saves it as a
// source asset: docs-src/path/screenshots/<name>.png plus <name>.json (alt text, the command, the capture date).
//   node docs-src/site-checks/path-screenshots.js topics      the topic list, after the connector published its first event
//   node docs-src/site-checks/path-screenshots.js messages    the messages of sybase.phoenix_test.payment, after the demo
// Run by lessons 8.3 and 9.2 (so the picture shows the state the lesson describes). Chrome only; the lab must be running.
const { launch } = require('./browser');
const { fs, path, ROOT } = require('./common');
const SHOTS = {
  topics: { name: 'kafka-ui-topics', url: '/ui/clusters/local/all-topics', wait: 'sybase.phoenix_test.payment', alt: 'The topic list of the Kafka web UI: the connector\'s internal topics and the topic sybase.phoenix_test.payment', command: 'the first change reached Kafka' },
  messages: { name: 'kafka-ui-messages', url: '/ui/clusters/local/all-topics/sybase.phoenix_test.payment/messages', wait: 'PATH-DEMO', alt: 'The messages of the topic sybase.phoenix_test.payment in the Kafka web UI, including the three events of the demonstration row', command: 'lab/path/demo/change-records.sh PATH-DEMO' },
};
const which = process.argv[2];
if (!SHOTS[which]) { console.log('usage: path-screenshots.js topics|messages'); process.exit(2); }
const s = SHOTS[which];

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 760 });
    await page.goto('http://localhost:8080' + s.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(t => document.body.innerText.includes(t), { timeout: 30000 }, s.wait);
    await new Promise(r => setTimeout(r, 1500));
    const dir = path.join(ROOT, 'docs-src', 'path', 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    const png = path.join(dir, s.name + '.png');
    await page.screenshot({ path: png });
    fs.writeFileSync(path.join(dir, s.name + '.json'), JSON.stringify({ name: s.name, file: s.name + '.png', alt: s.alt, command: s.command, capturedAt: new Date().toISOString().slice(0, 10) }, null, 1) + '\n');
    console.log(`saved docs-src/path/screenshots/${s.name}.png (${fs.statSync(png).size} bytes) from ${'http://localhost:8080' + s.url}`);
  } finally { await browser.close(); }
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
