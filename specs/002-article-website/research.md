# Research: Article Website

Each item: Decision, Rationale, Alternatives considered. Items marked "to verify" are confirmed by a task, not assumed (Principle I).

## 1. Page model: one long article page
- **Decision**: The article is one long page (`docs/site/index.html`) with 12 sections, like the reference post. "Previous/next" (FR-005) links to the neighbouring section anchors inside the page; reading progress is a thin bar at the top.
- **Rationale**: The reference is a single long post; one page makes browser find, print and anchor links work with no extra machinery, and keeps the existing section anchors stable.
- **Alternatives**: One page per section (more files, breaks print and find across sections); single page without section navigation (fails FR-005).

## 2. Tailwind used at build time, shipped as a local file
- **Decision**: Tailwind CSS 3.4.17 CLI compiles `site.css` (with `@tailwind` layers plus a few `@apply` components) into `docs/site/assets/site.css`; only the classes used by the templates are emitted. Colours, fonts and column width are theme tokens in `tailwind.config.js`; dark mode uses the `class` strategy so the manual choice and the device preference both work.
- **Rationale**: FR-011 forbids the CDN script (needs the internet, compiles in the browser). v3.4.17 is a stable release older than two weeks and its CLI runs on plain Node. Registry reachable (checked 2026-10-23).
- **Alternatives**: Tailwind v4 (newer config model, less known to the user, no benefit here); the CDN play script (breaks offline); hand-written CSS (ignores the user's stated technology).

## 3. Look: how "like the reference" is achieved
- **Decision**: Translate the look elements named in the spec Clarifications into theme tokens: white page and generous whitespace; reading column about 720 px; headline block (small category label, large title, summary, date and reading-time line); heading scale roughly 40/30/22 px with tight tracking; body 18 px, line height 1.7; code panels with a light grey background and a thin border (dark panels in dark mode); sticky side contents about 260 px; one accent colour used for links, active contents item and progress bar. Font stack is the system sans-serif stack plus a system monospace stack (no web fonts).
- **Rationale**: Matches the reading experience without copying text, images, logo or brand marks. System fonts keep the page offline and fast.
- **Alternatives**: Bundling a web font file (adds a licence and size question; not needed); pixel-copying the reference (copyright and brand problem, and not requested).
- **To verify**: A written side-by-side list of the look elements, backed by screenshots of this site and local screenshots of the reference page (SC-008). The reference screenshots stay on this machine and are git-ignored; nothing of the reference page is committed.

## 4. Guide pages from the existing READMEs
- **Decision**: `marked@12.0.2` converts `lab/increments/README.md` and the six step READMEs at build time into pages with the same shell. Relative links between READMEs are rewritten to the new page URLs by the build; links that point to files outside the site (scripts, source) become plain relative links to the repository file and are listed in the build report.
- **Rationale**: Keeps README text unchanged (FR-013) and avoids a second copy of the content.
- **Alternatives**: Copying the READMEs into HTML by hand (drifts); writing a mini converter (risk of changing text).
- **To verify**: The text comparison runs on the guide pages too.

## 5. Evidence index
- **Decision**: One generated page lists every file in `docs/evidence/` (name, number, first-line title from its `# Captured` header or file name), linking to the plain file. Sub-folders are discovered at build time and listed as links to each folder's files.
- **Rationale**: Matches the clarification (index only, files not restyled). Evidence files are linked from the article already (for example `evidence/28-source-restart.txt`); the article's relative links must keep resolving from `docs/site/`, so the build rewrites `evidence/NN-...` links to `../evidence/NN-...`.
- **Alternatives**: Copying evidence into `docs/site/` (duplicates, drift).

## 6. Search
- **Decision**: A search index (`id`, section number, heading text, a plain-text excerpt of the section body, keywords from the existing `data-keywords` attributes) is produced at build time and embedded in each page as JSON (so `file://` works without a fetch). The browser script does a case-insensitive word match, ranks headings above body text, and shows a result list with the empty message "Nothing found for ...". No library.
- **Rationale**: About 85 entries: a library (lunr, fuse) is more code than the problem. Inline JSON avoids the `file://` fetch restriction.
- **Alternatives**: lunr/fuse (extra dependency); browser find only (fails FR-006).

## 7. Reading without JavaScript
- **Decision**: All content, the contents list, section links and previous/next are plain HTML links. The script only adds: active-item highlight, progress bar, search box, theme toggle, copy buttons, and the collapsed/expanded behaviour is native `<details>` (already used for check questions). With scripts off, the search box and theme/copy controls are hidden by a `no-js` class that the script removes.
- **Rationale**: Meets the edge case; native `<details>` needs no script for FR-004.

## 8. Checks and evidence (how each success criterion is proven)
- **Decision**: One script per criterion in `docs-src/site-checks/`. Browser checks use `puppeteer-core` driving the installed Chrome (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, found 2026-10-23; Chrome also present). Offline check blocks every request that is not to the local files and fails on any attempt. Overflow check compares `document.documentElement.scrollWidth` to the window width at 320, 375, 768 and 1280 px for every page. Keyboard check performs the six actions of SC-005 with key events only. Text comparison extracts visible text from each generated section and from its source file and compares them after whitespace normalisation (code blocks compared exactly).
- **Rationale**: Each success criterion has a script whose output is evidence (Principle I); a failing script exits 1.
- **To verify**: puppeteer-core 25.12.0 installs and launches Chrome headless here (verified; Edge did not launch). Fallback if not: drive the Claude browser pane and record screenshots plus measured values, with the script variant marked "not run".
- **Alternatives**: Manual inspection only (not repeatable); Playwright (heavier download of its own browsers, which the offline-friendly setup avoids).

## 9. Relation to the old article page
- **Decision**: Keep `node docs-src/build.js article` and `docs/article.html` untouched for now. The new site is built by `node docs-src/build.js site`. The spec Assumption "replaces `docs/article.html`" is read as: the site is the published article; deleting the old output is left to the user (it would need the quickstart walkthrough, the audit script and the link check updated together).
- **Rationale**: Avoids breaking the 11-scenario walkthrough and the script audit that currently pass. Flagged in the plan re-check.
- **Alternatives**: Remove the old build now (more regression risk, no user value yet).

## 10. Print style
- **Decision**: A `print:` variant hides header, side contents, search, theme and copy controls, sets black text on white, lets code blocks wrap (`white-space: pre-wrap`) so nothing is cut off, and avoids breaking inside code blocks and tables where possible.
- **To verify**: Print preview is rendered to PDF with the browser and the text of the last code block is found in the PDF; *not run* on a physical printer.

## 11. Accessibility basics
- **Decision**: Landmarks (`header`, `nav`, `main`, `footer`), skip link, visible focus ring, buttons with accessible names, contrast in both themes checked by a script against 4.5:1 for body text and 3:1 for large text; the theme toggle exposes its state with `aria-pressed`.
- **To verify**: The contrast script runs on the compiled theme tokens. A screen reader was *not run*; only the structure is checked.

## 12. Hosting
- **Decision**: Out of scope (spec Assumptions). The site is verified from `file://` and from a local static server on `127.0.0.1` only.
