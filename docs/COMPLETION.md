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
