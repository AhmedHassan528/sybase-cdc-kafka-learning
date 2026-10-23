# Handbook progress tracker

Entry point: `docs/index.html` (built from `docs-src/chapters/*.html` by `node docs-src/build.js`).
Published copy (private, share from the page's Share menu): https://claude.ai/artifact/NPw8zyoTEMasGCkvpKN51k

Rebuild everything:
```
node docs-src/diagrams/drawio-gen.js && docs-src/diagrams/export.sh   # diagrams (Docker); export.sh runs postprocess.js
node docs-src/source/gen-source.js                                     # source pages + coverage check
node docs-src/build.js                                                 # main handbook
node docs-src/linkcheck.js docs external-links.txt                     # local links/anchors (expect problems=0)
node docs-src/publish-variant.js <out.html>                            # page body for the claude.ai artifact
```

## Phase A: Discover  [done]
- [x] Workspace inventory (no Git repository)
- [x] Runtime evidence `docs/evidence/01..13`
- [x] JAR checksum, custom image + archive + checksum

## Phase B: Validate  [done]
- [x] SAP LTL docs, kernel 5.8 change, Event Streams CRs + deprecation banner, Qlik precedent, Kafka Connect APIs, Docker seccomp
- [x] External link status check (2026-10-21): 16/17 HTTP 200; Canva share link returns 403 to scripted requests (design created through the Canva connector in this session)

## Phase C/D: Reconstruct & design  [done]
- [x] Timeline, 17 diagrams (.drawio + SVG, visually reviewed), Canva learning aid

## Phase E: Produce  [done]
- [x] assets/css, assets/js, build.js
- [x] Source pages: 23 files, coverage check passes
- [x] deploy/docker/Dockerfile.connect, deploy/openshift/*.yaml (untested templates)
- [x] Chapters 01-19 (32 numbered sections in the built page)

## Phase F: Verify  [done]
- [x] Local link/anchor check: 24 pages, 599 links, 0 problems; no duplicate ids
- [x] Referenced file paths exist (range notations such as `01…05` excepted)
- [x] Secret scan: no keys/tokens/private keys; only local test values (`rs_user`/`rs_password`, public image `sa` default) appear, labelled as local test values
- [x] Render check desktop (no horizontal overflow) and phone 375 px (fixed: grid `minmax(0,1fr)`, stacked `dl.kv`, wrapping inline code)
- [x] All 17 figures + Canva figure embedded; charts built from evidence CSVs

## Phase G: Deliver  [done]
- [x] Completion report: `docs/COMPLETION.md`

## Learning project (from-scratch connector)  [2026-10-23]
- [x] Article, 12 sections, `docs/article.html`
- [x] Build-along, six increments with starters, tests, live checks, solutions; 24 of 24 checks pass (evidence 35)
- [x] Experiments: key-changing update (27), ASE restart (28), run-twice (29), article script audit (30)
- [x] Quickstart walkthrough 11 of 11 (36), after fixing a path bug in the walkthrough script
- [x] Known gaps recorded in `lab/README.md`: `register-connector.sh` and `sample-data.sh` second run
- [ ] Not run: TLS/SASL, ASE crash, OpenShift/Event Streams (see COMPLETION.md)
