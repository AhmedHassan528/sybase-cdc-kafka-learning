---

description: "Task list for the article website"
---

# Tasks: Article Website

**Input**: Design documents from `/specs/002-article-website/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/site-structure.md, quickstart.md

**Tests**: The spec defines measurable outcomes (SC-001 to SC-008), so the check scripts are part of the work. Each check script is written before the piece it checks (see order inside each phase). Every check's output is captured with `lab/env/capture-evidence.sh` into `docs/evidence/` (Principle I); anything not run is labelled so.

**Organization**: Grouped by user story. Paths are relative to the repository root. Output in `docs/site/` is generated: never edit it by hand (Principle V).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 read the article, US2 find things across the site, US3 comfort and offline

## Phase 1: Setup

- [x] T001 Create `docs-src/package.json` with exact versions `tailwindcss` 3.4.17, `marked` 12.0.2 and `puppeteer-core` (exact version chosen at install: at least two weeks old, and it must launch the installed Chrome on Node 24; record the version and the launch result in the T011 output), run `npm install --prefix docs-src` to write `docs-src/package-lock.json`, and add `docs-src/node_modules/` to `.gitignore`; confirm `npm ci --prefix docs-src` works from the lock file
- [x] T002 [P] Create `docs-src/site/tailwind.config.js` (content paths `docs-src/site/templates/**/*.js` and `docs-src/site/client/site.js`; dark mode `class`; theme tokens: system sans and mono font stacks, reading column 720 px, heading scale 40/30/22 px, body 18 px with 1.7 line height, one accent colour) and `docs-src/site/styles/site.css` (the three `@tailwind` layers plus empty component layer)
- [x] T003 [P] Add a `site` mode to `docs-src/build.js` that runs `docs-src/site/build-site.js`, and create `docs-src/site/build-site.js` as an empty-but-running stub that exits 0 after printing "site: nothing built yet"; the existing `article` and handbook modes must behave exactly as before (run both and compare the `docs/article.html` and `docs/index.html` checksums with `lab/env/checksums.sh verify`)

## Phase 2: Foundational (blocks all user stories)

- [x] T004 Write `docs-src/site-checks/text-compare.js` first (FR-013, SC-006): for each article section and (later) guide page, extract visible text from the built page and from its source, normalise whitespace, compare (code blocks exactly); compare the body only: exclude the title block, header, contents, previous/next links and any script-added buttons; for guide pages compare against the README rendered with `marked` and tags stripped; print counts and every difference; exit 1 on any difference; it must fail now because nothing is built
- [x] T005 [P] Write `docs-src/site-checks/links.js` (FR-007, SC-003): checks every `href`/`src` and `#anchor` in `docs/site/**/*.html`, including `../evidence/...` and `../index.html`; prints `problems=N`; exit 1 if N > 0
- [x] T006 Implement the section model in `docs-src/site/build-site.js` per `data-model.md`: read `docs-src/article/NN-*.html` in order, keep the existing `<h2 id>`/`<h3 id>` ids, number the sections, collect headings and `data-keywords`, compute prev/next (none before section 1, none after section 12), fail the build on duplicate ids or a missing source
- [x] T007 Create the page shell in `docs-src/site/templates/shell.js` per `contracts/site-structure.md` (skip link, header with top navigation Article / Build-along / Handbook / Evidence, footer, no third-party branding) and the build step that runs the Tailwind CLI to write `docs/site/assets/site.css`
- [x] T008 Build the search index in `docs-src/site/build-site.js` per `data-model.md` (one entry per heading with an id, excerpt of at most 600 characters, keywords), write `docs/site/assets/search-index.json`, and embed the same JSON in each page
- [x] T009 Rewrite links in the generated article: `evidence/NN-name.txt` becomes `../evidence/NN-name.txt`, `docs/` relative links keep resolving, and any link the build cannot resolve is listed and fails the build (contracts: build interface)
- [x] T010 Create `docs-src/site/client/site.js` skeleton (an IIFE; removes the `no-js` class from `<html>`; every feature added in later tasks is a function guarded so that one failure cannot stop the others) and copy it to `docs/site/assets/site.js` in the build; the shell hides script-only controls with `no-js` (research 7)

**Checkpoint**: `node docs-src/build.js site` writes `docs/site/index.html` with the unstyled article text; `text-compare.js` and `links.js` run and pass on it.

## Phase 3: User Story 1 - Read the article like a blog post (Priority: P1)

**Goal**: The article page reads like the reference post.

**Independent Test**: Open `docs/site/index.html` at 1280 px and 375 px; read Sections 1 to 3 without sideways scrolling; find any section from the contents in one click; copy a command.

- [x] T011 [US1] Write `docs-src/site-checks/overflow.js` first (SC-002): with puppeteer-core driving Chrome (path in research 8), load every page under `docs/site/` at 320, 375, 768 and 1280 px and compare `document.documentElement.scrollWidth` with the window width; also assert that the widest code block and the widest table on each page scroll inside their own box (`scrollWidth > clientWidth` on the box, none on the page); print one line per page and width; exit 1 on any overflow. If puppeteer cannot launch Chrome here, record that as the result and use the browser-pane fallback from research 8, labelled in the evidence
- [x] T012 [US1] Title block in `docs-src/site/templates/article.js`: category label, title, one-sentence summary (taken from `docs-src/build.js` article metadata), date (read from `docs-src/site/site.json` field `date`, not from the clock, so rebuilds are byte-identical, SC-007) and reading time computed from the word count at 200 words per minute, rounded up to whole minutes
- [x] T013 [US1] Typography and layout in `docs-src/site/styles/site.css` and `docs-src/site/templates/article.js`: white page, 720 px reading column, heading scale, body text, lists, tables inside their own scroll box, figures with captions, the "look" elements from the spec Clarifications
- [x] T014 [P] [US1] Side contents list in `docs-src/site/templates/contents.js` (sections and sub-headings, sticky on wide windows, an openable "Contents" menu on narrow ones using a native `<details>`) and active-heading highlight with `aria-current="true"` in `docs-src/site/client/site.js` (FR-002)
- [x] T015 [P] [US1] Code blocks in `docs-src/site/styles/site.css` and `docs-src/site/client/site.js` (FR-003): light panel, line breaks kept, scrolls inside its own box, copy button copying exactly the block text with "Copied"/"Copy failed" feedback for 2 seconds; the button is added by script so the page without script still reads
- [x] T016 [P] [US1] Callouts and check questions in `docs-src/site/styles/site.css` (FR-004): style the existing `note` blocks, "not run" labels and `<details class="check">` as distinct callouts with the answer hidden until opened; no wording changes
- [x] T017 [US1] Previous/next links at the end of every section (none before section 1, none after section 12) and the reading-progress bar in `docs-src/site/templates/article.js` and `docs-src/site/client/site.js` (FR-005)
- [x] T018 [US1] Run `text-compare.js`, `links.js` and `overflow.js` on the article page; fix until they pass; capture outputs to `docs/evidence/39-site-text-compare.txt` and `docs/evidence/41-site-overflow.txt` (`links.js` cannot pass until the guide and evidence pages that the top navigation links to exist, so `docs/evidence/40-site-links.txt` is captured in T023)

**Checkpoint**: User Story 1 works on its own and is the MVP.

## Phase 4: User Story 2 - Find things on the whole site (Priority: P2)

**Goal**: Search, and the build-along guide and evidence index in the same design.

**Independent Test**: Search "oqid" and land on the right heading; follow the top navigation to the guide, the handbook and the evidence index.

- [x] T019 [US2] Write `docs-src/site-checks/search.js` first (SC-001): in the browser, search "oqid", "retry timeout" and "tombstone" and check that the result's anchor is the section containing the term; click each of the 12 contents entries and check that its section heading is in view (SC-001); search a nonsense term and check the "Nothing found for ..." message; exit 1 on failure
- [x] T020 [US2] Search box and results list in `docs-src/site/client/site.js` and `docs-src/site/templates/shell.js` (FR-006): 2 or more characters, headings ranked above body text, Enter or click goes to the anchor, "Nothing found for <term>" when empty, keyboard operable
- [x] T021 [P] [US2] Guide pages in `docs-src/site/build-guide.js` (called from `build-site.js`): convert `lab/increments/README.md` and the six step READMEs with `marked` into `docs/site/guide/index.html` and `docs/site/guide/NN-name.html` in the same shell; rewrite links between READMEs to the new pages and links to repository files to relative links that resolve; list every rewrite in the build report
- [x] T022 [P] [US2] Evidence index in `docs-src/site/build-evidence.js`: list every file under `docs/evidence/` (and the files in every sub-folder it contains, found at build time, for example `logs`, `ltl`, `queries`, `tests`, `site-look`) with number, title from the file name and a link to the plain file at `../evidence/<file>`; write `docs/site/evidence/index.html`
- [x] T023 [US2] Extend `text-compare.js` to the seven guide pages (README text equals page text), rebuild, and make `links.js`, `overflow.js` and `search.js` pass on all pages; capture to `docs/evidence/42-site-search.txt` and refresh evidence 39 to 41
- [x] T024 [US2] Add the site to the existing link check: update `docs-src/linkcheck.js` only if needed so `node docs-src/linkcheck.js docs links.txt` still reports `problems=0` with `docs/site/` present

**Checkpoint**: User Stories 1 and 2 both work.

## Phase 5: User Story 3 - Comfort, access and offline (Priority: P3)

**Goal**: Theme, print, keyboard and screen-structure basics, and proof of offline use.

**Independent Test**: Switch theme and reload; print-preview a section; walk the six keyboard actions; load everything with outside requests blocked.

- [x] T025 [US3] Write `docs-src/site-checks/offline.js` first (SC-004): load every page with every non-local request blocked and counted; fail on any attempted outside request, any failed resource, or a missing image/diagram; print counts
- [x] T026 [US3] Write `docs-src/site-checks/keyboard.js` first (SC-005): with key events only, perform the six actions (open contents, run a search, switch theme, copy a block, open a check question, follow previous/next) and check the result of each; print 6 of 6 or the failures
- [x] T027 [P] [US3] Theme in `docs-src/site/styles/site.css` and `docs-src/site/client/site.js` (FR-008): light and dark token sets, start from the device preference, toggle with `aria-pressed`, remember the choice in the browser's storage inside try/catch so it still works when storage is unavailable
- [x] T028 [P] [US3] Print style (FR-009, research 10): hide header, contents, search, theme and copy controls; black on white; wrap code so nothing is cut; avoid breaking inside code and tables
- [x] T029 [P] [US3] Accessibility basics (FR-010, research 11): landmarks, skip link, visible focus ring, accessible names on all controls; add `docs-src/site-checks/contrast.js` that computes contrast of the theme token pairs for both themes (4.5:1 body text, 3:1 large text) and exits 1 below those
- [x] T030 [US3] Make sure no resource comes from the internet (FR-011): no web fonts, no CDN scripts or styles, images and diagrams copied or referenced locally; the build fails if a generated page contains an `http(s)://` `src` or stylesheet `href`
- [x] T031 [US3] Run `offline.js`, `keyboard.js`, `contrast.js` and `overflow.js` in both themes; fix until they pass; capture to `docs/evidence/43-site-offline.txt`, `docs/evidence/44-site-keyboard.txt`, `docs/evidence/45-site-contrast.txt`; also check the remaining edge cases of the spec: with scripts disabled the article text, headings and contents links are present and the `no-js` controls are hidden; a forced clipboard failure shows "Copy failed" and leaves the text selectable; opening `index.html#<heading-id>` lands on that heading with the contents item marked (these edge cases are checked inside `keyboard.js`, so they are captured in evidence 44); emulate print media at A4 width with `docs-src/site-checks/print.js` (controls hidden, no code block cut off, PDF renders) and save to `docs/evidence/46-site-print.txt` (physical printer: not run)

**Checkpoint**: All three user stories work.

## Phase 6: Polish and cross-cutting

- [x] T032 Reproducibility (SC-007, FR-012): build twice and compare all files in `docs/site/` byte for byte; add `docs/site/index.html` and the CSS to `lab/env/checksums.sh` (required list), update `lab/experiments/checksums-negative-test.sh` (its copied tree must include the new required files) and re-run it to refresh `docs/evidence/31-checksums.txt`; fix any "N checked" counts quoted in `docs/COMPLETION.md` and `docs/PROGRESS.md`; run `bash lab/env/checksums.sh generate` last, then `verify`; capture to `docs/evidence/47-site-reproducible.txt`
- [x] T033 [P] Size budgets from the plan (article HTML under 400 KB, CSS under 60 KB, JS under 30 KB): measure and record in `docs/evidence/48-site-sizes.txt`; if a budget is missed, say so in the evidence and the completion report
- [x] T034 Look review (SC-008): open the site and the reference post side by side at 1280 px and 375 px, take screenshots of both; save only screenshots of this project's own site into `docs/evidence/site-look/`; keep the reference-page screenshots local as `docs/evidence/site-look/reference-*.png`, which `.gitignore` excludes (add that line); write the side-by-side list (headline block, column width, heading scale, code panels, side contents, accent colour) with present / different / missing for each in `docs/evidence/49-site-look-review.txt`; the reference page is viewed for comparison only and no part of it is committed
- [x] T035 [P] Secret scan and offline-lab rule (FR-015): run `bash lab/env/secret-scan.sh`; confirm no lab credential appears in `docs/site/`
- [x] T036 Run the 10 scenarios of `specs/002-article-website/quickstart.md` from a clean checkout state (`rm -rf docs-src/node_modules docs/site`, then `npm ci`), and save the results to `docs/evidence/50-site-quickstart.txt`; any scenario that fails is fixed or recorded, none skipped
- [x] T037 [P] Update `docs/PROGRESS.md` and `docs/COMPLETION.md` with the site deliverable, PASS / PARTIAL / NOT RUN counts (not run: browsers other than Chrome, physical printer, screen reader, public hosting), and the date; add a short "Website" section to `lab/README.md` or `README.md` with the build command
- [x] T038 Re-check SC-001 to SC-008 against the evidence with measured values, record gaps in the completion report, then run `/speckit-analyze` for this feature and fix any finding

## Dependencies and Execution Order

- **Phase 1** first. **Phase 2** blocks everything else. T004 and T005 are written before T006 to T010 are accepted.
- **US1 (Phase 3)** needs Phase 2 only. It is the MVP.
- **US2 (Phase 4)** needs Phase 2; T020 builds on the `site.js` skeleton from T010; T021 and T022 are independent of US1 and of each other.
- **US3 (Phase 5)** needs Phase 2; T031 needs the features of US1 and US2 to exist (it checks the whole site).
- **Polish (Phase 6)** after all stories. T032 generates checksums last; any file change after that requires regenerating them.
- Check scripts T011, T019, T025 and T026 are written before the features they check.

## Parallel opportunities

- Phase 1: T002 and T003.
- Phase 2: T005 alongside T004.
- US1: T014, T015, T016 (different files or sections of work) after T013.
- US2: T021 and T022 together.
- US3: T027, T028, T029 together.
- Polish: T033, T035, T037.

## Implementation strategy

1. Phases 1 and 2, then US1 only. Stop and check the article against the reference (MVP).
2. Add US2, then US3, running the checks after each phase.
3. Polish last: reproducibility, sizes, look review, quickstart, documentation, analyze.

## Notes

- Never claim a check passed unless its script ran and exited 0 (Principle I); a check that cannot run here is recorded as "not run" with the reason.
- If a check fails because of the check itself, fix the check and re-run everything it covers; do not edit evidence by hand.
- Do not commit or push without the user's say-so.
