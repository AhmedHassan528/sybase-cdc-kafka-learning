# Quickstart: Article Website

Validation scenarios. Each ends with an expected result; results are recorded in `docs/evidence/` by `lab/env/capture-evidence.sh` (Principle I). Run from the repository root in Git Bash. Needs Node 24 and, once, the internet for `npm ci`.

## 1. Build the site
```bash
npm ci --prefix docs-src
node docs-src/build.js site
```
Expected: `docs/site/` exists; the last line reports 12 sections, 7 guide pages, 1 evidence index, and the search entry count; exit 0.

## 2. Rebuild is reproducible (SC-007)
```bash
node docs-src/build.js site && bash lab/env/checksums.sh generate && node docs-src/build.js site && bash lab/env/checksums.sh verify
```
Expected: verify reports 0 failed after the second build.

## 3. Text is unchanged (SC-006, FR-013)
```bash
node docs-src/site-checks/text-compare.js
```
Expected: 12 article sections and 7 guide pages compared (body text only), 0 differences.

## 4. Links (SC-003)
```bash
node docs-src/site-checks/links.js
```
Expected: `problems=0`; existing `node docs-src/linkcheck.js docs links.txt` still reports `problems=0`.

## 5. Offline (SC-004)
```bash
node docs-src/site-checks/offline.js
```
Expected: every page loaded with outside requests blocked; 0 failed or attempted outside requests.

## 6. No horizontal scroll (SC-002)
```bash
node docs-src/site-checks/overflow.js
```
Expected: each page at 320, 375, 768 and 1280 px reports no page-level overflow.

## 7. Keyboard use (SC-005)
```bash
node docs-src/site-checks/keyboard.js
```
Expected: 6 of 6 actions pass: open contents, run a search, switch theme, copy a block, open a check question, follow previous/next.

## 8. Search (SC-001)
```bash
node docs-src/site-checks/search.js
```
Expected: known terms ("oqid", "retry timeout", "tombstone") return the section that contains them; a nonsense term returns the "Nothing found" message.

## 9. Look review (SC-008)
Open `docs/site/index.html` and the reference post side by side at 1280 px. Fill the side-by-side list (headline block, column width, heading scale, code panels, side contents, accent colour) in `docs/evidence/49-site-look-review.txt`. Screenshots of the reference post stay local and git-ignored. Expected: every listed element present; differences noted.

## 10. Secret scan and checksums (FR-015)
```bash
bash lab/env/secret-scan.sh && bash lab/env/checksums.sh verify
```
Expected: scan passes; the checksum file lists `docs/site/index.html` and verifies.

## Not run (stated up front)
Browsers other than Chrome; a physical printer; a screen reader; hosting on a public server.
