# Implementation Plan: Article Website

**Branch**: `002-article-website` (work stays on `main`) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-article-website/spec.md`

## Summary

Turn the 12 article source files, the six build-along READMEs and the evidence list into a static website that looks like the Confluent JDBC deep-dive post (clean white page, headline block, narrow reading column, sticky side contents, light code panels, one accent colour). A Node build script (extending the existing `docs-src/build.js`) writes the site to `docs/site/`. Styles are written with Tailwind and compiled at build time into one local CSS file; the small browser script (contents highlight, search, theme, copy, progress) is plain JavaScript with no libraries. Nothing is loaded from the internet at read time. A set of check scripts proves the spec's measurable outcomes (text identical to the sources, links, offline, no horizontal scroll at four widths, keyboard use) and writes their output to `docs/evidence/`.

## Technical Context

**Language/Version**: Node.js 24 (already used by `docs-src/build.js`); browser JavaScript (ES2019, no modules needed); HTML5; Tailwind CSS 3.4.17 for the styles.

**Primary Dependencies** (build-time only, all pinned to exact versions in `docs-src/package.json` with a committed `package-lock.json`): `tailwindcss@3.4.17` (CLI, compiles the CSS); `marked@12.0.2` (turns the build-along READMEs from Markdown into HTML); `puppeteer-core` (exact version fixed at install time and recorded in the lock file) for the browser checks, driving the Chrome already installed on this machine. No runtime dependency ships in the site.

**Storage**: Files. Sources in `docs-src/` and `lab/increments/`; output in `docs/site/`; the reader's theme choice is kept in the reader's own browser storage only.

**Testing**: Node check scripts in `docs-src/site-checks/` (text comparison, link check, offline check, overflow measurement, keyboard walkthrough, search check). Each run is captured with `lab/env/capture-evidence.sh` into `docs/evidence/`.

**Target Platform**: Current desktop and phone browsers, opened from disk (`file://`) or any static file server. Verified in this environment with Chrome only; other browsers are *not run* (Principle I).

**Project Type**: Static website generated from existing sources (no server, no database).

**Performance Goals**: Page loads from disk with no visible delay: article page under 400 KB of HTML plus one CSS file under 60 KB and one JS file under 30 KB (measured and recorded; these are size budgets, not user-facing claims).

**Constraints**: Offline (FR-011); no third-party fonts, scripts, styles or images at read time; works without JavaScript for reading (Edge Cases); generated files never hand-edited (Principle V).

**Scale/Scope**: 12 article sections (about 85 headings), 7 guide pages, 1 evidence index (42 evidence files and sub-folders listed), 1 search index of about 85 entries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate (requirements it covers) | Status |
|-----------|-------------------------------|--------|
| I. Evidence-Based Claims | The site changes presentation only; a text comparison proves the article and guide text is unchanged (FR-013, SC-006); every measured claim about the site (widths, offline, keyboard) is captured as evidence or labelled "not run" | Pass at design; the evidence is produced during implementation |
| II. Kafka Connect Contract Fidelity | Not touched | N/A |
| III. Test-First for Core Logic | Core connector logic is not touched. For the site, the check scripts are written before the pieces they check (task order) | N/A for connector; followed for site |
| IV. Secure by Default | No secrets in the site; no outside requests at read time (FR-011, FR-015); secret scan is part of the quickstart. TLS/SASL concerns the connector and is unchanged (existing documented exception) | Pass at design |
| V. Reproducible Builds and Deliverables | One command rebuilds the site from checked-in sources (FR-012); dependencies pinned with a lock file; `docs/site/` is generated and never hand-edited; checksum file lists the site; link check zero problems (FR-007, FR-015, SC-003, SC-007) | Pass at design |

Technical Constraints (constitution): "Dependencies MUST be pinned to explicit versions; new runtime dependencies need a stated reason." The three new dependencies are build-time only, pinned with a lock file, and none ships in the site (reasons in research.md). Java and Maven constraints do not apply to this feature.

Post-design re-check (after Phase 1): no violations. One thing to watch is recorded in research.md decision 9: the old `docs/article.html` build is kept, so two article outputs exist until the user decides to drop the old one.

## Project Structure

### Documentation (this feature)

```text
specs/002-article-website/
├── plan.md              # This file
├── research.md          # Phase 0: decisions with alternatives
├── data-model.md        # Phase 1: pages, sections, search entries
├── quickstart.md        # Phase 1: how to build and verify
├── contracts/
│   └── site-structure.md  # URL layout, page anatomy, search index, controls
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
docs-src/
├── build.js                    # existing; gains a "site" mode that calls site/build-site.js
├── package.json                # new: pinned build-time dependencies
├── package-lock.json           # new: committed lock file
├── site/
│   ├── build-site.js           # reads article sources, guide READMEs, evidence list; writes docs/site/
│   ├── templates/              # page shell, header, footer, section, prev/next (plain HTML template strings)
│   ├── styles/site.css         # Tailwind input (layers, components, theme variables)
│   ├── tailwind.config.js      # content paths, theme tokens (colours, type scale, column width)
│   └── client/site.js          # the one browser script (contents, search, theme, copy, progress)
└── site-checks/
    ├── text-compare.js         # built text vs sources (SC-006)
    ├── links.js                # extends the existing link check to docs/site
    ├── offline.js              # loads every page with outside requests blocked (SC-004)
    ├── overflow.js             # widths 320/375/768/1280 (SC-002)
    ├── keyboard.js             # six keyboard-only actions (SC-005)
    └── search.js               # search finds known terms, empty result message (SC-001)

docs/site/                      # GENERATED, never hand-edited
├── index.html                  # the article (single long page, 12 sections)
├── guide/index.html            # build-along landing page
├── guide/01-listener.html ... guide/06-package-and-run.html
├── evidence/index.html         # evidence index (links to the plain files in ../evidence/)
├── assets/site.css             # compiled Tailwind output
├── assets/site.js              # copy of client/site.js (or minified)
└── assets/search-index.json    # also inlined into each page for file:// use
```

**Structure Decision**: Keep the generator in `docs-src/` next to the existing handbook and article builders, and write the generated site to `docs/site/` so it ships with the other deliverables and is covered by the same link check and checksum. The handbook (`docs/index.html`) and the old `docs/article.html` build are not changed.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No violations. Recorded trade-offs:

| Choice | Why | Simpler alternative rejected because |
|--------|-----|--------------------------------------|
| Three build-time dependencies (Tailwind, marked, puppeteer-core) | The user named Tailwind; Markdown guide pages need a converter; the width, offline and keyboard checks need a real browser | Hand-written CSS ignores the stated technology; a hand-rolled Markdown converter risks changing README text (FR-013); measuring layout without a browser would only be a guess |
