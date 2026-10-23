# Quickstart: End-to-End Learning Path

Validation scenarios. Each result is recorded in `docs/evidence/` with `lab/env/capture-evidence.sh` (Principle I). Run from the repository root in Git Bash with Docker running. Needs Node 24 (`npm ci --prefix docs-src` done) and Chrome.

## 0. Baseline before any change (SC-008)
```bash
node docs-src/site-checks/site-unchanged.js --record
```
Expected: a baseline file with one hash per existing page body is written. Done once, before the path is added.

## 1. Run the whole path in the lab (SC-001, SC-002)
```bash
bash lab/path/run-path.sh
```
Expected: the lab is reset, every lesson's steps run in order, each exits as expected, and `docs/evidence/path/_run.txt` states the total time (target: under 20 minutes with the images pulled).

## 2. Repeat and compare (SC-002)
```bash
bash lab/path/verify-path.sh
```
Expected: every step's masked output equals the recorded evidence; any difference is listed. Parts labelled "example, not run" are counted and not compared.

## 3. Build the site
```bash
node docs-src/build.js site
```
Expected: the new pages are written under `docs/site/path/`; the last line reports stages, lessons, Java lessons and diagrams.

## 4. Lesson parts (SC-003, SC-010)
```bash
node docs-src/site-checks/path-lint.js
```
Expected: every lesson has title, description, objectives, prerequisites with a check step, commands with outputs, troubleshooting, and a diagram or stated reason; 0 problems.

## 5. Java lessons (SC-004)
```bash
bash lab/path/list-java-members.sh && node docs-src/site-checks/path-java.js
```
Expected: 19 pages compared with their files, 0 differences; every class and method has a note; 0 missing.

## 6. Values table (SC-005)
```bash
node docs-src/site-checks/path-env.js
```
Expected: every configuration key, port, host, environment variable, topic and path is in the table; 0 missing, 0 extra.

## 7. Diagrams (SC-006)
```bash
node docs-src/site-checks/path-diagrams.js
```
Expected: each of the five topics has a diagram, each linked to a step whose recorded output shows the same state.

## 8. Existing pages unchanged (SC-008)
```bash
node docs-src/site-checks/site-unchanged.js
```
Expected: 0 differences in the body text of the existing pages; the only change is the added navigation entry (and the added rows of the evidence index).

## 9. Progress (SC-007)
```bash
node docs-src/site-checks/path-progress.js
```
Expected: mark three lessons, reload: three marks and "3 of N" remain; with storage blocked the lessons read normally.

## 10. Site standards (SC-009)
```bash
node docs-src/site-checks/links.js && node docs-src/site-checks/offline.js && node docs-src/site-checks/overflow.js && node docs-src/site-checks/keyboard.js && node docs-src/site-checks/search.js
```
Expected: all pass on all pages including the new ones; search finds lesson titles and Java class names.

## 11. Secret scan and checksums (FR-021)
```bash
bash lab/env/secret-scan.sh && bash lab/env/checksums.sh verify
```
Expected: the scan passes; the checksum file covers `docs/site/path/index.html` and verifies.

## 12. The demonstration by hand
Follow only Stage 9 on a freshly started lab: change a record (insert, update, delete) and run the check command. Expected: the events for the three changes are in the topic the lesson names, with the operations and key the lesson states.

## Not run (stated up front)
Operating systems other than Windows with Docker Desktop; browsers other than Chrome and Edge; a physical printer; a screen reader; public hosting; real TLS (the certificate lesson is an example).
