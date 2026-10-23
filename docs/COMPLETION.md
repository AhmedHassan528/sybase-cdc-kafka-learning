# Completion report: Sybase CDC handbook (Phase G)

Date: 2026-10-21

## Entry point
- Local: `docs/index.html` (open in a browser; no server or internet needed except external reference links).
- Published (private): https://claude.ai/artifact/NPw8zyoTEMasGCkvpKN51k

## What was delivered
| Item | Location |
|---|---|
| Handbook, 19 chapter files → 32 numbered sections | `docs/index.html`, sources in `docs-src/chapters/` |
| Stylesheet and script | `docs/assets/css/styles.css`, `docs/assets/js/docs.js` |
| Annotated source, every Java file (19 main + 4 test) | `docs/source/*.html` |
| 17 editable draw.io diagrams + SVG exports | `docs/diagrams/src/*.drawio`, `docs/diagrams/src/svg/` |
| Canva learning aid | `docs/assets/img/canva-cdc-explained.png` (Canva design DAHYleGLi4M) |
| Evidence (real captured outputs) | `docs/evidence/` |
| Worker image recipe, saved image | `deploy/docker/Dockerfile.connect`, `deliverables/images/sybase-cdc-connect-0.1.0.tar.gz` |
| OpenShift / Event Streams templates (untested) | `deploy/openshift/01…05_*.yaml` |
| Build and check scripts | `docs-src/build.js`, `docs-src/linkcheck.js`, `docs-src/publish-variant.js`, `docs-src/source/gen-source.js`, `docs-src/diagrams/*` |

## Test status (from the test chapter)
- Unit tests: 11/11 PASS.
- Integration: 14 PASS, 1 PARTIAL (least-privilege test: start/stop and `sp_setreptable` not tried).
- NOT RUN: ASE SP04 PL07 HF1, OpenShift/Event Streams, invalid-config cases, TLS/SASL/secret rotation, multiple tables and non-PK tables, soak test, transactions over 200,000 rows, log-full emergency (deliberately), exactly-once.

## Verification performed (Phase F)
- Local links and anchors: 24 pages, 599 links, 0 problems, no duplicate ids.
- External links: 16 of 17 return HTTP 200; the Canva share link returns 403 to scripted requests.
- Secret scan: no keys, tokens or private keys. Only the local Docker test values appear, labelled as such.
- Rendering: desktop and 375 px phone width without horizontal page scroll (three CSS fixes applied); light and dark themes.

## Corrections made while writing (documentation now matches evidence)
- Overview throughput card said "≈10,000/s sustained, on a laptop"; corrected to ≈8,600/s average with a 12,900/s best 11-second sample on one Windows PC.
- Overview scenario count "13/13" corrected to 14 PASS + 1 PARTIAL of 15.
- Log page size documented as 16 KB (derived from `sp_helpdb` free KB / free pages); `@@pagesize` reports the 2 KB virtual page size.
- No code, configuration or test result was changed to improve the documentation.

## Unresolved questions (need the bank's teams)
1. Production ASE facts: `@@servername`, database, charset, tables in scope, primary keys, log size, write rate, largest transaction.
2. Does SP04 PL07 HF1 RepAgent accept LTL 760 from a non-SAP endpoint, and is the byte format unchanged? (migration chapter procedure)
3. Licensing / support position on RepAgent use with a third-party endpoint.
4. Strategic Kafka platform, given IBM's deprecation banner on Event Streams; operator version (field `externalConfiguration` vs template volumes; `spec.state` support).
5. Network: LoadBalancer vs NodePort, firewall path from the SLES host, TLS options for the LTL connection.
6. Who owns and supports the connector code; where it will live in Git and CI.

## Main risks
- Undocumented protocol (S7, HIGH) and clear-text RepAgent login (S1, HIGH).
- Log growth when the connector is down; the emergency procedure is destructive and needs DBA sign-off.
- Memory for large transactions (heap reached 1,954 MiB in the 1M-row test).
- Verdict: not production-ready; see the readiness and security chapters.

---

# Update: from-scratch connector learning project (2026-10-23)

## What was added
| Item | Location |
|---|---|
| Article "Kafka Connect Deep Dive, Sybase CDC" (12 sections, first person, real outputs) | `docs/article.html`, sources in `docs-src/article/` |
| Build-along: six steps ("increments") with starter, tests, live check and reference solution | `lab/increments/`, `lab/solutions/`; entry point `lab/increments/README.md` |
| Lab environment (Docker only, digest-pinned images, local only) | `lab/env/`, `lab/README.md` |
| Experiments behind the article's claims | `lab/experiments/` |
| Evidence 14 to 38 | `docs/evidence/` |
| Checksums of the deliverables | `docs/checksums.sha256` (`lab/env/checksums.sh generate` / `verify`) |

## Test status (all executed in this session, output in `docs/evidence/`)
- PASS: quickstart walkthrough 11 of 11 scenarios (evidence 36); six increments, starters fail and solutions pass, unit and live: 24 of 24 checks (35); lab security 78 of 78 (21); article script audit 0 of 41 references missing (30); links 25 pages, 812 local links, 0 problems; secret scan; image pins (33); PowerShell path (22).
- Experiments run: offsets, restart, duplicates after a crash (26), rollback, multi-row and multi-table transactions, data types, "no data" causes (16 to 18), key-changing update (27), ASE graceful restart (28), run each setup script twice (29).
- PARTIAL: run-twice (29): `start`, `create-accounts`, `set-tables` pass twice; `register-connector.sh` exits 0 but prints 3 error-looking lines on the second run; `sample-data.sh` exits 1 on a second run. Documented in `lab/README.md`; the scripts were left as they are.
- NOT RUN: TLS and SASL (documented exception, Principle IV); ASE crash or long outage; OpenShift and IBM Event Streams; very large transactions; Windows-only run of the bash experiments; learner timing; interrupting a live check with Ctrl+C.
- The log lines quoted in article Section 6 ("LTL server on port 11752 stopped" and the ASE error log) were observed but not saved as evidence; the article says so.

## Found and corrected while writing
- Walkthrough scenario 7 failed three times because of the script, not the article: the links-file path `/tmp/...` was read by Node as `E:\tmp\...`. Fixed in `lab/experiments/quickstart-walkthrough.sh`; the final run passed 11 of 11.
- Earlier fixes (wrong article claims, false-pass image check, capture-evidence exit code, crash-duplicates measurement) are listed in `docs/PROGRESS.md`.
