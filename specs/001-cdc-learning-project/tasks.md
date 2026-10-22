# Tasks: Hands-On CDC Learning Project (SAP/Sybase ASE to Kafka)

**Input**: Design documents from `/specs/001-cdc-learning-project/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. FR-018 requires tests or verification output for every build-along increment, and the constitution (Principle III) requires tests for core logic.

**Organization**: Grouped by user story. Article sections live in `docs-src/article/` (the existing handbook stays in `docs-src/chapters/`); the lab lives in `lab/`; evidence goes to `docs/evidence/`. Rebuild the article with `node docs-src/build.js`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story the task belongs to (US1 to US5)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new `lab/` layout and article skeleton

- [x] T001 Create the lab directory layout from plan.md: `lab/env/`, `lab/increments/01-listener` to `06-package-and-run`, `lab/solutions/`, `lab/experiments/`
- [x] T002 [P] Create a Maven parent `lab/pom.xml` (Java 17, `connect-api` 3.8, slf4j 1.7.36, JUnit 5.10.2, surefire 3.2.5) matching `sybase-cdc-connector/pom.xml`
- [x] T003 [P] Create the article skeleton: one placeholder chapter per section from `contracts/article-structure.md` in `docs-src/article/`, built to `docs/article.html` by `node docs-src/build.js article` (existing handbook in `docs-src/chapters/` and `docs/index.html` kept unchanged)
- [x] T004 [P] Add `lab/README.md` explaining the folder layout, the increment contract (`contracts/lab-increment.md`) and prerequisites (Docker, about 15 GB disk, 8 GB RAM, Java 17, Maven, Node.js)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The reproducible local environment and evidence tooling every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Write `lab/env/docker-compose.yml` for ASE, Kafka, Kafka Connect (image built from `deploy/docker/Dockerfile.connect`) and Kafka UI. Image references: `datagrip/sybase@sha256:72f1e825…` (tested 2019 build; its only tag is `latest`), `apache/kafka:3.8.0@sha256:c89f315c…`, `provectuslabs/kafka-ui:v0.7.2@sha256:8f2ff02d…`; `Dockerfile.connect` pins the same Kafka digest. Published ports 5000, 29092, 8083 and 8080 are bound to `127.0.0.1`; 11752 is not published (FR-022, FR-025). The `connect` service has `restart: on-failure:5` because it once failed to resolve `kafka` at start (see research.md)
- [x] T006 [P] Write `lab/env/start.sh` and `lab/env/start.ps1` that bring the stack up and wait until ASE, Kafka and the Connect REST API answer
- [x] T007 [P] Write `lab/env/reset.sh` and `lab/env/reset.ps1` that return ASE data, Kafka topics and connector offsets to a clean state (FR-008)
- [x] T008 [P] Write sample dataset scripts `lab/env/sample-data.sql` (2 to 3 tables, enabled for capture, reusing `sybase/00_database.sql` to `03_log_threshold.sql`) and `lab/env/changes.sql` (scripted insert, update, delete) (FR-003)
- [x] T009 [P] Write `lab/env/consume.sh` and `lab/env/consume.ps1` that print Kafka events for a topic (based on `captures/consume.sh`)
- [x] T010 Run the start, load, change and consume scripts from a clean machine state and save the captured output as `docs/evidence/14-lab-first-event.txt` (Principle I)
- [x] T011 [P] Add an evidence helper `lab/env/capture-evidence.sh` that runs a command and saves output plus date and image versions under `docs/evidence/`
- [x] T012 [P] Add a secret scan script `lab/env/secret-scan.sh` that fails on keys or tokens except labelled local test values (Principle IV, FR-010)

Added after analysis findings D1 to D3 (each was run and its result saved before being ticked). The IDs continue the global numbering, so they are not in file order; **execute them in the order listed here**:

- [x] T064 [P] Add `lab/env/verify-images.sh`: checks that every image is pinned by digest, that the digest resolves in the registry and matches the local image; output and the `datagrip/sybase` `latest` versus `16.0` comparison saved as `docs/evidence/20-image-versions.txt` (FR-025) (after T005)
- [x] T065 Add `lab/env/create-accounts.sh` and `create-accounts.ps1`: login `cdc_admin` (only `replication_role`) and login `cdc_app` (DML on `payment`; `sample-data.sql` and `types.sql` grant on their tables); passwords generated into git-ignored `lab/env/.lab-secrets`, removed by `reset`; `start.*` calls it; `register-connector.*` runs as `cdc_admin`, `changes.*` and the experiments as `cdc_app`, `sa` only for setup (FR-021, FR-023) (after T005 and T006; `start.*` calls it)
- [x] T066 [P] Add input validation: `set-tables.sh` accepts only `name,name` lists of letters, digits and underscore; `consume.sh`, `consume.ps1` and `await-event.sh` accept only a topic name of letters, digits, dot, underscore and hyphen and a numeric timeout (FR-024) (independent; after T006 to T009 exist)
- [x] T069 Add the "Security scope" section to `lab/README.md` and the TLS/SASL exception to `plan.md` Complexity Tracking; both state that TLS/SASL were not performed or tested and that no production security claim is made (FR-026) (before T067, because T067 checks that this text exists)
- [x] T067 Add `lab/env/verify-security.sh` (78 checks: loopback-only ports including a connection attempt from the machine network address, role and permission matrix of both accounts with refused-action tests, `sa` used only by setup scripts, secrets not tracked and not in git history, secret scan, input rejection, documented limits); output saved as `docs/evidence/21-lab-security.txt` (FR-021 to FR-024, FR-026) (after T010, T012, T064 to T066 and T069; needs a running lab with the connector registered)
- [x] T068 Add `lab/experiments/powershell-path.ps1` and run the PowerShell scripts from a clean lab; two defects found and fixed (SQL line endings; stderr treated as an error in `consume.ps1`); output saved as `docs/evidence/22-powershell-path.txt` (after T006 to T009 and T065)

**Checkpoint**: A learner can start, load data, change data, see events and reset.

---

## Phase 3: User Story 1 - Understand CDC end to end (Priority: P1) 🎯 MVP

**Goal**: A learner can explain the path from a committed change to a published event and what can go wrong at each stage.

**Independent Test**: A learner reads sections 1 to 4, then explains each stage and answers the check questions correctly.

- [x] T013 [US1] Write Section 1 "Introduction" in `docs-src/article/01-introduction.html` (first-person voice, the end-to-end path, what the reader will build)
- [x] T014 [P] [US1] Write Section 3 "Source database prerequisites" in `docs-src/article/03-source-prerequisites.html` using `docs/evidence/08-ase-facts.txt` and `sybase/*.sql`, linking evidence for each claim
- [x] T015 [P] [US1] Write Section 4 "Choosing what to capture" in `docs-src/article/04-choosing-what-to-capture.html`
- [x] T016 [P] [US1] Create or reuse one end-to-end flow diagram in `docs-src/diagrams/` (source database, change feed, connector, Kafka) and embed it in Section 1 (FR-014: diagrams only where text cannot show the flow)
- [x] T017 [US1] Add check questions with answers to Sections 1, 3 and 4 (FR-011) in the same chapter files
- [x] T018 [US1] Rebuild and run the link check: `node docs-src/build.js article` then `node docs-src/linkcheck.js docs links.txt` (expect problems=0)

**Checkpoint**: Concept sections readable and linked to evidence.

---

## Phase 4: User Story 2 - Run a working pipeline locally (Priority: P1)

**Goal**: A learner follows ordered steps and sees insert, update and delete events in Kafka.

**Independent Test**: From a clean machine meeting prerequisites, a learner follows Section 2 and sees one event per scripted change.

- [x] T019 [US2] Write Section 2 "Try it at home" in `docs-src/article/02-try-it-at-home.html`: prerequisites (FR-007), start, load sample data, register the connector (`connectors/sybase-cdc-phoenix.json`), run `lab/env/changes.sql`, each step with a success check (FR-002)
- [x] T020 [P] [US2] Add expected event output for each scripted change to Section 2, copied from `docs/evidence/14-lab-first-event.txt` (FR-004)
- [x] T021 [P] [US2] Write Section 6 "Why is there no data?" in `docs-src/article/06-why-no-data.html`: symptoms keyed list (FR-006). Two are reproduced with scripts and evidence (`lab/experiments/no-data-table-not-included.sh`, `no-data-connector-paused.sh`; evidence 16 and 17); the rest are labelled as from the original project and not re-run
- [x] T022 [P] [US2] Write Section 8 "Message keys and topic naming" in `docs-src/article/08-keys-and-topics.html` with real configuration and output
- [x] T023 [P] [US2] Write Section 9 "Data types" in `docs-src/article/09-data-types.html` using `docs/evidence/ltl` and `captures/ltl-types.txt`
- [x] T024 [P] [US2] Write Section 10 "Multiple tables" in `docs-src/article/10-multiple-tables.html`
- [x] T025 [US2] Add check questions to Sections 2, 6, 8, 9 and 10, then rebuild and run the link check
- [x] T026 [US2] Dry-run Section 2 start to finish on the lab environment and record any step that failed or was unclear as fixes in the chapter; save the run log as `docs/evidence/19-section2-dry-run.txt`

**Checkpoint**: Learner reaches a first change event using only the article and `lab/env/`.

---

## Phase 5: User Story 3 - Explore reliability behaviors (Priority: P2)

**Goal**: A learner runs guided experiments and sees ordering, rollback handling and at-least-once delivery.

**Independent Test**: Each experiment states its expected result; the learner runs it and compares.

- [x] T027 [P] [US3] Write experiments `lab/experiments/restart-connector.sh` (restart the connect container while 30 rows are written) and `lab/experiments/crash-duplicates.sh` (kill the connect container right after it published, then restart). Bash only; on Windows run in Git Bash. The expected result is written in each script header before the first run (FR-020) *Result: `restart-connector.sh` run once: 30 of 30 rows delivered, 0 duplicates (evidence 25). `crash-duplicates.sh`: the first attempt (kill 1 s after the commit) delivered 6 of 6 rows with 5 duplicated events, the same `source.oqid` appearing twice (evidence 26). Duplicates depend on timing: an earlier version that killed the connector about 1 s after it saw the last event produced none in 6 events.*
- [x] T028 [P] [US3] Write experiment `lab/experiments/rollback.sh` (bash only): a rolled-back transaction yields no events, the committed one after it does *Result: run once, the rolled-back row produced 0 events and the committed row 1 (evidence 23).*
- [x] T029 [P] [US3] Write experiment `lab/experiments/multi-row-transaction.sh` (bash only): the events of one transaction keep their order, `xid`, `seq` and `txn_rows` *Result: run once, 5 events in statement order with one `xid`, `seq` 0 to 4 and `txn_rows` 5 (evidence 24).*
- [x] T030 [P] [US3] Write `lab/experiments/find-duplicates.sh` (bash only) that counts events and groups them by `source.oqid` (see `contracts/change-event.md`) *Result: used by `restart-connector.sh` and `crash-duplicates.sh`; counts events, distinct `oqid` and duplicates (evidence 25 and 26).*
- [x] T031 [US3] Run each experiment and save the outputs to `docs/evidence/23-rollback.txt`, `24-multi-row-transaction.txt`, `25-restart-connector.txt` and `26-crash-duplicates.txt` (duplicate counts come from `find-duplicates.sh`). Done when each file exists and the observed result is compared with the expected result in the script header; if they differ, fix the claim, not the evidence *Result: four experiments run and saved (evidence 23 to 26); observed results match the expectations written in the script headers (no row lost; duplicates possible after a crash; rolled-back row never delivered; transaction order kept).*
- [ ] T070 [US3] (edge case: update that changes a key) Write `lab/experiments/key-change-update.sh` (bash only): on `ltl_types`, whose primary key `id` is not an identity column, run `update ltl_types set id = <new> where id = <old>` for a tagged row. Done when: the expected result is written in the script header before the first run; the output is saved as `docs/evidence/27-key-change-update.txt`; Section 8 (keys) states what was observed (the record key, the `before` and `after` keys, one update event or a delete plus insert), as observed even if it differs from the expectation
- [ ] T071 [US3] (edge case: source restart in the middle of a verification step) Write `lab/experiments/source-restart.sh` (bash only): start an `await-event.sh` wait, restart the ASE container (`docker restart cdc-lab-sybase`) while it runs, then write rows after ASE is back. Done when: `docs/evidence/28-source-restart.txt` shows (a) the wait either finished after ASE returned or ended with its explicit `TIMEOUT` message within the stated limit, never hanging, (b) the row counts in ASE and in Kafka for the tag, (c) the RepAgent state from `sp_help_rep_agent` after the restart; Section 6 gets a symptom entry for it
- [ ] T072 [US3] (repeatability) Run each lab script twice in a row from a working lab (`start`, `register-connector`, `create-accounts`, `sample-data`, `set-tables` with the same list, `changes`, `verify-security`, `verify-images`, `secret-scan`) with `lab/experiments/run-twice.sh` (bash only). Done when `docs/evidence/29-run-twice.txt` lists each script with the result of its second run; scripts meant to be idempotent exit 0 without error or duplicate objects, scripts that are not by design (`changes` adds rows again) are listed with that reason, and any unexpected failure is fixed in the script and the run repeated
- [x] T032 [US3] Write Section 7 "Resetting and restarting from a chosen point" in `docs-src/article/07-reset-and-restart.html` using `lab/env/reset.*` and the offset experiment `lab/experiments/offsets.sh` (bash only; output in `docs/evidence/37-offsets.txt`) *Result: written; all four expectations in the script header held on a freshly built lab (REST view null and not able to move the task; direct write to `_connect-offsets` moves it; rewind re-sends; tombstone gives "none (first start)"). Not run: rewinding beyond what ASE holds, writing the record while the connector runs, starting under a new connector name.*
- [x] T033 [US3] Write Section 11 "Reliability experiments" in `docs-src/article/11-reliability.html`: expected result stated before each run, at-least-once explained, duplicate handling shown (FR-005, FR-020) *Result: written from evidence 23 to 26; no de-duplicating consumer was run (stated in the section).*
- [x] T034 [US3] Add check questions to Sections 7 and 11, rebuild, run the link check *Result: 3 check questions each in Sections 7 and 11; build and link check pass (756 links, 0 problems).*

**Checkpoint**: Reliability claims each backed by captured evidence.

---

## Phase 6: User Story 5 - Build the connector step by step (Priority: P2)

**Goal**: A learner builds the connector in six checkpoints, each verified, with a reference solution.

**Independent Test**: A learner completes one increment, runs its verify script, and passes without needing later increments.

### Tests first (each must fail on the starter and pass on the solution)

- [ ] T035 [P] [US5] Increment 1 tests in `lab/increments/01-listener/tests/` (listener accepts a login and a client connection) based on `sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/tds/` and `ltl/LtlServer.java`. **Live check (FR-019):** `lab/increments/01-listener/verify-live.sh` uses T075 to run the learner's listener instead of the connector and passes when the listener log shows the RepAgent login being accepted and `connect source MYSYBASE.phoenix_test`
- [ ] T036 [P] [US5] Increment 2 tests in `lab/increments/02-ltl-parser/tests/`, adapted from `LtlParserTest.java` and `LtlValuesTest.java`. **Live check (FR-019):** `lab/increments/02-ltl-parser/verify-live.sh` uses T075 and passes when the log shows the parsed `INSERT` of a row written by `cdc_app` with the right table name and column values
- [ ] T037 [P] [US5] Increment 3 tests in `lab/increments/03-transaction-buffer/tests/`, adapted from `TransactionBufferTest.java` (commit delivers, rollback discards, order preserved)
- [ ] T038 [P] [US5] Increment 4 tests in `lab/increments/04-connect-records/tests/` checking record shape against `contracts/change-event.md`
- [ ] T039 [P] [US5] Increment 5 tests in `lab/increments/05-acks-and-offsets/tests/`, adapted from `AckTrackerTest.java` (offsets advance only after acknowledgement)
- [ ] T040 [P] [US5] Increment 6 verify script `lab/increments/06-package-and-run/verify.sh` that builds the plugin, starts it in the lab and checks one live event
- [ ] T075 [US5] (before the live checks of T035 and T036) Write `lab/env/run-listener-live.sh <classpath> <main-class> [args]`: stops the connector (`PUT /connectors/<name>/stop`; `pause` does not free port 11752), starts the class in the Connect container, writes one tagged row as `cdc_app`, waits for the RepAgent, prints the listener log, then kills the listener (matching the process with `ps -ef | grep "[X]"`, because `pkill -f` matches its own shell) and resumes the connector. Done when it works with the finished project's `LtlProbe` (evidence 34) and a second run leaves the connector `RUNNING` and delivering. Rows the listener saw are still delivered later by the connector (observed in evidence 34), so the check does not lose data

### Reference solutions and starters

- [ ] T041 [US5] Create `lab/solutions/01-listener/` (TDS channel, login, LTL server) from the existing `tds` and `ltl` classes, and the matching starter in `lab/increments/01-listener/starter/`
- [ ] T042 [US5] Create `lab/solutions/02-ltl-parser/` (lexer, parser, values, commands) and starter, built on solution 01
- [ ] T043 [US5] Create `lab/solutions/03-transaction-buffer/` (`TransactionBuffer`, `CommittedTransaction`, `Oqid`) and starter, built on solution 02
- [ ] T044 [US5] Create `lab/solutions/04-connect-records/` (`ChangeEventMapper`, config, source task) and starter, built on solution 03
- [ ] T045 [US5] Create `lab/solutions/05-acks-and-offsets/` (`AckTracker`, offset commit) and starter, built on solution 04
- [ ] T046 [US5] Create `lab/solutions/06-package-and-run/` (connector class, shaded plugin) and its starter, built on solution 05
- [ ] T047 [US5] Write `lab/increments/NN-*/README.md` for all six increments: goal, what to write, hints, expected result (contract `lab-increment.md`)
- [ ] T048 [US5] Write `lab/increments/NN-*/verify.sh` and `verify.ps1` for increments 1 to 5 printing PASS or FAIL and the first difference
- [ ] T049 [US5] Verify the contract: for every increment, confirm tests fail on the starter and pass on the solution, and save results to `docs/evidence/35-increments-verify.txt`
- [ ] T050 [US5] Confirm the final solution matches `sybase-cdc-connector/` functionally by running the existing unit tests (11) plus one live event, and note any difference
- [ ] T051 [US5] Write Section 5 "How changes are read and delivered" in `docs-src/article/05-build-along.html`: one subsection per increment with code, commands, checks and the reference solution link; embed annotated source from `docs/source/` where useful
- [ ] T073 [US5] (FR-011) Add check questions to Section 5: at least one per increment (6) and one about the whole path, each with an answer that names the reference solution file it comes from. Done when `docs-src/article/05-build-along.html` has at least 7 `class="check"` entries, every answer cites a file under `lab/solutions/`, and the link check passes

**Checkpoint**: All six increments verified and the build-along section is readable.

---

## Phase 7: User Story 4 - Take the pipeline toward production (Priority: P3)

**Goal**: A learner can say what changes for a managed platform and which parts are untested.

**Independent Test**: A learner lists the required changes and identifies untested parts.

- [ ] T052 [US4] Write Section 12 "Where to go from here" in `docs-src/article/12-where-next.html`, reusing `deploy/openshift/` and `deploy/docker/` content
- [ ] T053 [P] [US4] Add a "not run" status table to Section 12 from `docs/COMPLETION.md` (ASE SP04 PL07 HF1, OpenShift or Event Streams, invalid-config cases, TLS/SASL, secret rotation) (FR-009)
- [ ] T054 [P] [US4] Add a security-scope note to Section 12 based on `lab/README.md` and evidence 21 and 22: what was tested (accounts, loopback ports, secrets, input checks) and what was not (TLS/SASL, production security); no production claim (FR-026)
- [ ] T055 [US4] Add check questions to Section 12, rebuild, run the link check

**Checkpoint**: Production section is honest about what was and was not tested.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency checks across the article and lab

- [ ] T056 Review the article against `contracts/article-structure.md`: section order, voice, one concern per section, diagrams only where needed
- [ ] T057 [P] Audit claims for Principle I: every behavior and test claim links to `docs/evidence/` or is labelled "not run" (SC-004); list and fix any gaps
- [ ] T058 [P] Run `lab/env/secret-scan.sh` over the repository and fix findings (SC-005, FR-010)
- [ ] T059 [P] Regenerate annotated source pages with `node docs-src/source/gen-source.js` so the coverage check passes for the new `lab/` files
- [ ] T074 [P] (FR-015 audit) Write `lab/env/audit-article-scripts.sh` that reads `docs-src/article/*.html`, collects every `lab/...` path and every command in a `data-lang="bash"` block that starts with `lab/`, and reports `file:line` for each one whose file does not exist. Done when it exits 0 on the finished article and its output is saved as `docs/evidence/30-article-script-audit.txt`; it exits 1 when a referenced script is removed (negative test, output saved); examples that are SQL or output only are listed as "not applicable" with the reason
- [ ] T060 Run `node docs-src/build.js article`, `node docs-src/build.js` (handbook, unchanged) and `node docs-src/linkcheck.js docs links.txt` (expect problems=0, FR-012)
- [ ] T061 Walk through `quickstart.md` scenarios 1 to 11 from a clean environment and record results in `docs/evidence/36-quickstart-validation.txt`
- [ ] T062 [P] Update `docs/PROGRESS.md` and `docs/COMPLETION.md` with the new deliverables, test status (PASS, PARTIAL, NOT RUN counts) and date, and add checksums (Principle V, "SHOULD carry a checksum"): `lab/env/checksums.sh generate` writes `docs/checksums.sha256` with the SHA-256 of (1) `plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar`, (2) the shaded JAR built from `lab/solutions/06-package-and-run/`, (3) `deliverables/images/sybase-cdc-connect-0.1.0.tar.gz` when the file is present (it is git-ignored because of its size; if absent it is reported as SKIPPED, not as a mismatch), (4) `docs/index.html` and `docs/article.html`. `checksums.sh verify` runs `sha256sum -c`, prints `OK` or `FAILED` per file and a final `N checked, M failed, K skipped`, and exits 1 if any file failed or a required file is missing. Done when verify exits 0 on a clean tree and exits 1 after one byte of a copy of a deliverable is changed (both outputs saved as `docs/evidence/31-checksums.txt`)
- [ ] T063 Re-check the spec success criteria SC-001 to SC-006 with a dry run and record measured times and gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: after Setup; blocks all stories. It holds T005 to T012 and the later-added T064 to T069, executed in the order listed in the phase
- **US1 (Phase 3)** and **US2 (Phase 4)**: after Foundational; independent of each other (US2 needs the lab, US1 needs only evidence)
- **US3 (Phase 5)**: after Foundational and a working pipeline from US2's setup (T019). T070 to T072 need the lab running with the connector registered; T070 also needs `lab/env/types.sql` (T008 area) for the non-identity key table
- **US5 (Phase 6)**: after Foundational; increments depend on each other in order (1 to 6)
- **US4 (Phase 7)**: after Foundational; can run any time
- **Polish (Phase 8)**: after all desired stories. T074 needs every article section it audits to be written; T062 (checksums) needs the JAR from T046

### Within Each Story

- Tests before solutions (T035 to T040 before T041 to T046)
- Evidence captured before the claim is written
- Chapter written, then check questions, then rebuild and link check
- Experiment scripts: expected result in the header before the first run, then run, then save evidence, then write the claim

### Parallel Opportunities

- T002, T003, T004 together; T006 to T009, T011, T012 together
- US1 sections T014 to T016 together; US2 sections T020 to T024 together
- Experiments T027 to T030 together; increment tests T035 to T040 together
- US1, US2 and US4 can be written by different people in parallel after Phase 2

## Parallel Example: User Story 5

```text
# Write all increment tests together:
Task: "Increment 1 tests in lab/increments/01-listener/tests/"
Task: "Increment 2 tests in lab/increments/02-ltl-parser/tests/"
Task: "Increment 3 tests in lab/increments/03-transaction-buffer/tests/"
```

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Phase 1 Setup, then Phase 2 Foundational
2. Phase 3 (US1) and Phase 4 (US2)
3. **Stop and validate**: a learner reaches a first change event (SC-001 first-event target of 4 hours, SC-002)

### Incremental Delivery

1. MVP above
2. Add US3 (reliability), validate with the experiments
3. Add US5 (build-along), validate each increment
4. Add US4 (production), then Polish

## Notes

- [P] tasks touch different files
- Save evidence before writing claims (Principle I); label untested items "not run"
- Do not hand-edit `docs/` output; change `docs-src/` and rebuild (Principle V)
- Commit after each task or logical group
