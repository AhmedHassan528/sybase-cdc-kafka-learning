# Contract: Site structure and controls

This is what the built site exposes to readers and to the check scripts.

## URL layout (relative to `docs/site/`)
| Path | Content |
|------|---------|
| `index.html` | the article, 12 sections, anchors `#<section-id>` and `#<heading-id>` (same ids as `docs/article.html`) |
| `guide/index.html` | build-along landing page (from `lab/increments/README.md`) |
| `guide/NN-<name>.html` | one page per step README (six pages) |
| `evidence/index.html` | evidence index; each row links to `../evidence/<file>` (plain text) |
| `assets/site.css`, `assets/site.js`, `assets/search-index.json` | compiled styles, script, search index |

Links to the handbook go to `../index.html`.

## Page anatomy (every page)
1. Skip link ("Skip to content").
2. Header: site name, top navigation (Article, Build-along, Handbook, Evidence), search box, theme toggle. Reading-progress bar under the header on article and guide pages.
3. Article and guide pages: title block (category label, title, summary, date, reading time), then the reading column; side contents list (sticky on wide windows, a "Contents" menu on narrow ones).
4. Footer: project name, link to the evidence index. No third-party branding.

## Controls (each keyboard-operable, with an accessible name)
| Control | Behaviour |
|---------|-----------|
| Contents list | one link per section and sub-heading; the item for the heading in view has `aria-current="true"` |
| Copy button on each code block | copies exactly the block's text; shows "Copied" or "Copy failed" for 2 seconds |
| Search | typing 2 or more characters lists matches (heading, section, short excerpt); Enter or click goes to the anchor; no match shows "Nothing found for <term>" |
| Theme toggle | cycles light / dark; sets `aria-pressed`; remembers the choice; absent choice follows the device |
| Previous / next | at the end of each section; first section has no previous, last has no next |
| Check questions | native `<details>`; answer hidden until opened |

## Build interface
| Command | Result |
|---------|--------|
| `npm ci --prefix docs-src` | installs the pinned build-time dependencies (needs the internet once) |
| `node docs-src/build.js site` | writes all of `docs/site/`; exits non-zero on a missing source, duplicate id, or unresolved link rewrite; prints counts (pages, sections, headings, search entries) |
| `node docs-src/site-checks/<name>.js` | one check; exit 0 pass, 1 fail; first line of output states what it checked |

## Invariants checked by the scripts
- Body text of every article section and guide page in the site equals its source text (whitespace normalised; code exact). Added parts (title block, header, contents, previous/next, buttons) are excluded; guide pages are compared with the README after Markdown rendering with tags removed.
- Every `href` and `src` resolves; every `#anchor` exists on its page.
- No request leaves the local files when any page is loaded.
- `scrollWidth <= window width` for every page at 320, 375, 768 and 1280 px.
- Generated files are not committed with hand edits: a rebuild produces identical bytes (SC-007).
