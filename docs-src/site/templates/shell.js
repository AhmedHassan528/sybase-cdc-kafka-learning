// Page shell shared by every page of the site: skip link, header (navigation, search, theme), main, footer.
const { esc, jsonForScript } = require('../util');

const NAV = [
  { key: 'article', label: 'Article', href: 'index.html' },
  { key: 'guide', label: 'Build-along', href: 'guide/index.html' },
  { key: 'code', label: 'Code', href: 'code/index.html' },
  { key: 'handbook', label: 'Handbook', href: '../index.html' },
  { key: 'evidence', label: 'Evidence', href: 'evidence/index.html' },
];

// Applies the saved theme before the page paints (no flash). Falls back to the device preference.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');}catch(e){if(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}})();`;

function header(p) {
  const links = NAV.map(n => {
    const cur = n.key === p.current ? ' aria-current="page"' : '';
    return `<a class="nav-link" href="${p.root}${n.href}"${cur}>${n.label}</a>`;
  }).join('');
  return `<header class="site-header">
<div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
<a class="brand font-bold" href="${p.root}index.html">${esc(p.siteName)}</a>
<nav class="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Site">${links}</nav>
<div class="ml-auto flex items-center gap-2">
<div class="search relative js-only" role="search"><label class="sr-only" for="ui-search">Search the site</label>
<input id="ui-search" class="search-input" type="search" placeholder="Search" autocomplete="off" aria-controls="ui-results" aria-expanded="false">
<div id="ui-results" class="search-results" hidden></div></div>
<button id="ui-theme" class="btn js-only" type="button" aria-pressed="false" aria-label="Dark theme">Dark</button>
</div></div>
<div id="ui-progress" class="progress js-only" role="presentation"><span></span></div>
</header>`;
}

function footer(p) {
  return `<footer class="site-footer"><div class="mx-auto max-w-7xl px-4 py-8 text-sm text-mute sm:px-6">
${esc(p.siteName)}. A learning project: the numbers and outputs come from the <a href="${p.root}evidence/index.html">evidence files</a>, and anything not run is labelled so.
</div></footer>`;
}

// p: { title, description, root, current, body, searchIndex, siteName }
function page(p) {
  return `<!doctype html>
<html lang="en" class="no-js" data-root="${p.root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<script>${THEME_INIT}</script>
<link rel="stylesheet" href="${p.root}assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(p)}
<main id="main">
${p.body}
</main>
${footer(p)}
<script type="application/json" id="search-index">${jsonForScript(p.searchIndex)}</script>
<script src="${p.root}assets/site.js" defer></script>
</body>
</html>
`;
}

module.exports = { page, NAV };
