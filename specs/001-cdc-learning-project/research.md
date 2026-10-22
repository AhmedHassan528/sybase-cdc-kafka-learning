# Research: Hands-On CDC Learning Project

No `NEEDS CLARIFICATION` items remained in the Technical Context. The decisions below record the choices made and why. Items marked "to verify" must get captured evidence before the article states them (Constitution Principle I).

## R1. Article structure and tone
- **Decision**: One long-form article in first-person tutorial voice, with the section order from FR-013, modeled on Confluent's "Kafka Connect Deep Dive – JDBC Source Connector" (intro, try it at home, prerequisites, what to capture, incremental behavior, why no data, resetting, keys, topic names, data types, multiple tables, where next). Style reference only; no text copied.
- **Rationale**: Learners get a familiar shape: a working demo first, then one concern per section, troubleshooting driven.
- **Alternatives**: Multi-page course with quizzes (heavier, not asked); slide deck (loses command and log detail).

## R2. Build-along increments
- **Decision**: Six increments that map to existing connector classes: (1) listener and login, (2) LTL parser, (3) transaction buffer, (4) Connect records, (5) acks and offsets, (6) package and run.
- **Rationale**: Existing packages (`tds`, `ltl`, `cdc`, `connect`) already separate these concerns, so each increment has a ready reference solution and tests.
- **Alternatives**: One big exercise (no checkpoints); rewriting the connector in a simpler design (diverges from the evidence already captured).

## R3. Lab environment
- **Decision**: A single compose file under `lab/env/` for ASE, Kafka, Kafka Connect and Kafka UI, with scripts to start, load sample data, generate changes, verify and reset. Based on the containers already used (`cdc-sybase`, `cdc-kafka`, `cdc-connect`, `cdc-kafka-ui`).
- **Rationale**: FR-008 needs a reset, FR-016 needs a local ASE. No compose file exists today, so it must be written and tested.
- **Alternatives**: Manual `docker run` steps (not repeatable). To verify: the compose file reproduces the current container settings (ports 5000, 8083, 11752, 29092, 8080).

## R4. Source of changes
- **Decision**: The ASE RepAgent sends LTL directly to the connector's listener (port 11752); no Replication Server and no stand-in source (spec clarification).
- **Rationale**: Matches the finished connector and the captured evidence in `docs/evidence/ltl`.
- **To verify**: ASE version and RepAgent behavior on the container image; recorded in `docs/evidence/08-ase-facts.txt`.

## R5. Delivery guarantee
- **Decision**: At-least-once. Offsets commit only after a transaction is acknowledged; restart experiments show duplicates and how to detect them (for example by `source.oqid` carried in each event).
- **Rationale**: Matches the connector design and Constitution Principle II.
- **To verify**: a restart experiment with captured output before the article claims the behavior.

## R6. Publishing and checks
- **Decision**: Keep the static HTML build (`node docs-src/build.js`), the link check, and the secret scan; add the new article as a second page of the existing build (`node docs-src/build.js article`).
- **Rationale**: Already working and verified (0 link problems, 24 pages).
- **Alternatives**: A new site generator (unneeded change).

## R7. Known gaps to record honestly
- Not run to date: ASE SP04 PL07 HF1, OpenShift or Event Streams, invalid-config cases, TLS/SASL (from `docs/COMPLETION.md`). The article's production section MUST label them "not run".

## Implementation notes (2026-10-22)

- **Article location (resolves analysis I2)**: the existing 19-chapter handbook stays as `docs/index.html`, unchanged. The learning article is a separate page, `docs/article.html`, built by `node docs-src/build.js article` from `docs-src/article/`. Both share the same CSS and script.
- **Lab container names**: the lab uses `cdc-lab-*` names so it never clashes with the earlier `cdc-*` containers on a machine.
- **Image pinning (resolves analysis D1)**: `lab/env/docker-compose.yml` pins ASE, Kafka and Kafka UI by digest.
- **Reset**: `reset.*` removes the lab containers and their data (a full reset, then `start.*` again). A faster data-only reset is not implemented yet.
- **Real event shape**: captured in `docs/evidence/14-lab-first-event.txt` and recorded in `contracts/change-event.md`; the earlier draft field names (`txid`, `oqid`, `insert`) were guesses and have been replaced.

## Corrections after analysis findings D1 to D3 (2026-10-22)

Only items that were run and checked are listed.

- **D1, images**: `lab/env/docker-compose.yml` and `deploy/docker/Dockerfile.connect` pin by digest; `apache/kafka:3.8.0` and `provectuslabs/kafka-ui:v0.7.2` also keep a version tag (the tags were checked against the registry). The ASE image has no version tag for the tested build: its only tag is `latest` (built 2019-07-23). The tag `16.0` (updated 2024-01-11) is a different build (16 layers against 12) and was not tested, so it is not used. Evidence: `docs/evidence/20-image-versions.txt`, regenerate with `lab/env/verify-images.sh`.
- **D3, accounts**: the `replication_role`-only login can stop, start and configure the RepAgent and read table replication status; it cannot read or change table data, create or drop tables, grant, create logins or shut the server down. The DML-only login can change the sample tables and nothing else. This also closes the gap left in `docs/evidence/12-ase-privilege-test.txt`, which had not tried `sp_start_rep_agent` or `sp_stop_rep_agent`. Evidence: `docs/evidence/21-lab-security.txt`.
- **D3, exposure**: all published ports are bound to `127.0.0.1` and 11752 is not published; a connection to the machine's network address on ports 5000, 8083, 8080 and 29092 did not answer while loopback answered.
- **D3, TLS/SASL**: not performed or tested; recorded as an exception in `plan.md` and stated in `lab/README.md`.
- **Compose, Connect start-up**: during verification Kafka Connect once exited at start with "No resolvable bootstrap urls" (it could not resolve `kafka` yet) and nothing restarted it. The compose file now has `restart: on-failure:5` for `connect`. The failed log was not kept; the rerun from a clean lab passed (evidence 22 and 21).
- **PowerShell**: the `.ps1` scripts were run from a clean lab (`docs/evidence/22-powershell-path.txt`). Two defects appeared and were fixed: SQL sent with Windows line endings lost its `go` terminators (SQL is now normalised and sent base64-encoded), and `consume.ps1` failed on harmless stderr output.

- **Offsets (Section 7)**: on a freshly built lab the REST `GET .../offsets` returned `"offset": null` although `_connect-offsets` held a position, and a REST `PATCH` changed only the REST view. The engineering handbook (troubleshooting entry `ts-offsets`) says this does not occur on a fresh environment; the experiment contradicts that (evidence 37). Writing the record into `_connect-offsets` with the task's key worked.
