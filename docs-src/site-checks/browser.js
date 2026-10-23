// Launches the installed Chrome through puppeteer-core (Edge did not launch headless here; see specs/002-article-website/research.md).
// Set CHROME_PATH to use another Chrome.
const { pathToFileURL } = require('url');
const { path, SITE, pages } = require('./common');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function launch() {
  const puppeteer = require('puppeteer-core');
  return puppeteer.launch({ executablePath: CHROME, headless: true });
}
const fileUrl = rel => pathToFileURL(path.join(SITE, rel)).href;
module.exports = { launch, fileUrl, CHROME, pages, SITE };
