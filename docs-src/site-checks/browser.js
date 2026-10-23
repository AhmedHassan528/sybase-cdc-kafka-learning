// Launches a browser for the checks through puppeteer-core.
//   default            the installed Chrome (CHROME_PATH overrides the path)
//   BROWSER=edge       the installed Microsoft Edge. puppeteer-core cannot launch Edge directly here (the Edge launcher process
//                      exits at once with code 0), so Edge is started by hand with a debugging port and a temporary profile, and
//                      puppeteer connects to it.
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { path, SITE, pages } = require('./common');
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const CHROME_EXE = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WHICH = (process.env.BROWSER || 'chrome').toLowerCase();
const CHROME = WHICH === 'edge' ? EDGE : CHROME_EXE;

async function launchEdge(puppeteer) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'site-edge-'));
  const child = cp.spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  let browser = null, lastErr = null;
  for (let i = 0; i < 30 && !browser; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` }); } catch (e) { lastErr = e; }
  }
  if (!browser) { child.kill(); throw new Error('Edge did not accept a connection: ' + (lastErr && lastErr.message)); }
  const close = browser.close.bind(browser);
  browser.close = async () => { try { await close(); } finally { child.kill(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Edge may still hold the temporary profile; the OS temp folder cleans it later */ } }, 2000).unref(); } };
  return browser;
}

async function launch() {
  const puppeteer = require('puppeteer-core');
  if (WHICH === 'edge') return launchEdge(puppeteer);
  return puppeteer.launch({ executablePath: CHROME_EXE, headless: true });
}
const fileUrl = rel => pathToFileURL(path.join(SITE, rel)).href;
module.exports = { launch, fileUrl, CHROME, WHICH, pages, SITE };
