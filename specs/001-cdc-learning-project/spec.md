# Feature Specification: Hands-On CDC Learning Project (SAP/Sybase ASE to Kafka)

**Feature Branch**: `001-cdc-learning-project`

**Created**: 2026-10-22

**Status**: Draft

**Constitution**: Principles I to V of `.specify/memory/constitution.md` v1.0.0 (I Evidence-Based Claims, II Kafka Connect Contract Fidelity, III Test-First for Core Logic, IV Secure by Default, V Reproducible Builds and Deliverables). Each requirement that touches a principle names it in italics at the end of the requirement.

**Input**: User description: "Establish the constitution for a hands-on learning project that teaches how to build a Change Data Capture (CDC) pipeline from SAP/Sybase ASE to Apache Kafka. claude" (confirmed by the user as a request to specify the learning project itself; the constitution is out of scope here)

## Clarifications

### Session 2026-10-22

- Q: What form should the learning project take (handbook only, handbook plus lab scripts, or interactive lab)? → A: A long-form, hands-on deep-dive article in the style of Confluent's "Kafka Connect Deep Dive – JDBC Source Connector" (first-person tutorial voice, "try it at home" setup, real commands, configs and outputs, troubleshooting by symptom), with runnable scripts supporting the examples.
- Q: Which source-database setup should learners use for the hands-on examples? → A: A local Sybase ASE container only; connecting to the learner's own ASE server is out of scope.
- Q: Should the article teach learners to build the connector itself or only to configure and run it? → A: Full build-along: learners build the connector step by step, in addition to configuring, running and troubleshooting it.
- Q: Should the build-along read the real change feed or a simplified stand-in source? → A: The real change feed: the Sybase ASE container sends its change log directly to the connector, using the project's provided Docker environment (ASE, Kafka, Kafka Connect, Kafka UI). No stand-in source and no separate Replication Server.
- Q: What delivery guarantee should the finished pipeline promise after a crash or restart? → A: At-least-once: no committed change is lost; duplicates are possible after a restart, and the article shows how to detect and handle them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand CDC end to end (Priority: P1)

A learner who knows basic databases and messaging wants to understand how a row change in a Sybase ASE database becomes an event in a Kafka topic, and why each stage exists.

**Why this priority**: Without a clear mental model, the hands-on steps are copy-and-paste. This is the foundation for everything else.

**Independent Test**: A learner reads the concept material, then explains the data path and the role of each stage without help, and answers the check questions correctly.

**Acceptance Scenarios**:

1. **Given** a learner with no CDC experience, **When** they finish the concept material, **Then** they can describe each stage of the path from a committed database change to a published event.
2. **Given** the concept material, **When** the learner reaches a stage, **Then** it states what happens, why, and what can go wrong.

---

### User Story 2 - Run a working pipeline locally (Priority: P1)

A learner follows guided, ordered steps to start a local environment, make changes in the source database, and see matching events arrive in Kafka.

**Why this priority**: Seeing real changes flow is the core of "hands-on" and the main learning payoff.

**Independent Test**: Starting from a clean machine that meets the stated prerequisites, a learner follows the steps and sees insert, update and delete events for a sample table in Kafka.

**Acceptance Scenarios**:

1. **Given** a clean machine meeting the prerequisites, **When** the learner follows the setup steps, **Then** the environment starts and each step has a check that confirms success.
2. **Given** a running pipeline, **When** the learner inserts, updates and deletes rows, **Then** one event per change appears in Kafka with the before and after values where applicable.
3. **Given** a step fails, **When** the learner looks up the symptom, **Then** a troubleshooting entry explains the cause and fix.

---

### User Story 3 - Explore reliability behaviors (Priority: P2)

A learner runs guided experiments (restarting components, multi-row transactions, rollbacks) to see how ordering, transaction boundaries and no-loss delivery are preserved.

**Why this priority**: Reliability is what separates a demo from a real pipeline, but it builds on the working pipeline.

**Independent Test**: Each experiment states the expected result; the learner runs it and compares the observed result.

**Acceptance Scenarios**:

1. **Given** a running pipeline, **When** the learner restarts the connector mid-stream, **Then** no committed change is lost and the experiment shows how duplicates are handled.
2. **Given** a transaction that is rolled back, **When** the learner checks Kafka, **Then** no events for it appear.

---

### User Story 4 - Take the pipeline toward production (Priority: P3)

A learner reads how the local setup maps to a managed container platform and what security and operations concerns apply, with clear labels on what was and was not tested.

**Why this priority**: Valuable context, but not needed to learn the core concepts.

**Independent Test**: A learner can list the changes needed for a managed environment and identify which parts are untested.

**Acceptance Scenarios**:

1. **Given** the production section, **When** the learner reads a claim, **Then** it is backed by captured evidence or marked as not run.

---

### User Story 5 - Build the connector step by step (Priority: P2)

A learner builds the connector incrementally, from reading the first change record to publishing acknowledged, transaction-ordered events, and sees it work at each checkpoint.

**Why this priority**: The project's purpose is teaching how to build a pipeline, but it relies on the learner first seeing a working one (P1).

**Independent Test**: A learner completes one increment, runs its verification, and gets the expected result without needing later increments.

**Acceptance Scenarios**:

1. **Given** a finished increment, **When** the learner runs its verification, **Then** it passes and shows the expected output.
2. **Given** a learner is stuck, **When** they open the reference solution, **Then** they can continue from that checkpoint.

---

### Edge Cases

- The learner's machine lacks resources or a required component, or a download is unavailable.
- The source database is unreachable or restarts during a step.
- Large or multi-row transactions, and updates that change a key.
- A step is run twice, or run out of order.
- Documentation links or vendor pages change after publication.
- A restart causes already-delivered changes to be re-sent (duplicates).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide concept material explaining each stage from source change to published event.
- **FR-002**: The project MUST provide ordered, hands-on setup steps with an explicit success check after each step.
- **FR-003**: The project MUST include a sample dataset and scripted changes (insert, update, delete) for the learner to run. *(Constitution: Principle V)*
- **FR-004**: The project MUST show the expected event output for each scripted change. *(Constitution: Principle I)*
- **FR-005**: The project MUST include guided reliability experiments, each with a stated expected result. *(Constitution: Principle I, II)*
- **FR-006**: The project MUST include a troubleshooting section keyed by symptom. *(Constitution: Principle I)*
- **FR-007**: The project MUST list prerequisites (knowledge, software, resources) before the first step. *(Constitution: Principle V)*
- **FR-008**: The project MUST support resetting the environment to a clean state so any step can be repeated. *(Constitution: Principle V)*
- **FR-009**: Every claim about behavior or test results MUST cite captured evidence or be marked "not run". *(Constitution: Principle I)*
- **FR-010**: The repository, the article and the evidence files MUST contain no real credentials. The only credentials stored in files are labelled public test values: the `sa` default of the ASE image and the connector login `rs_user` / `rs_password`. *Scope: values stored in files; FR-023 covers passwords the lab creates at run time.* *(Constitution: Principle IV)*
- **FR-011**: The project MUST include check questions or exercises for each major topic.
- **FR-012**: The project MUST be rebuildable from its source materials, and its links MUST resolve. *(Constitution: Principle V)*
- **FR-013**: The main deliverable MUST be a single long-form deep-dive article written in a practical, first-person tutorial voice, with exactly these 12 sections in this order: (1) introduction, (2) "try it at home" setup, (3) source database prerequisites, (4) choosing what to capture, (5) how changes are read and delivered (the build-along), (6) why there is no data (troubleshooting), (7) resetting and restarting from a chosen point, (8) message keys and topic naming, (9) data types, (10) multiple tables, (11) reliability experiments, (12) where to go from here.
- **FR-014**: The article MUST show real commands, connector configuration, and captured outputs or log excerpts for each topic, and MUST use a small number of diagrams only where text cannot show the flow. *(Constitution: Principle I)*
- **FR-015**: Each runnable example in the article MUST have a script in the repository that reproduces it, so the article and scripts stay consistent. *(Constitution: Principle V)*
- **FR-016**: All hands-on examples MUST run against a local, containerized source database provided by the project; instructions for using a learner's own database server are out of scope. *Scope: where the examples run; FR-022 covers how the lab is exposed on the network.* *(Constitution: Principle IV, V)*
- **FR-017**: The article MUST include a build-along in which the learner builds the connector incrementally (reading the source change log, parsing changes, buffering by transaction, publishing events, acknowledging committed transactions), with a working checkpoint and a verification step after each increment. *(Constitution: Principle III)*
- **FR-018**: Each build-along increment MUST include its own automated tests or verification output, and a reference solution MUST be available so a learner who is stuck can continue. *(Constitution: Principle III)*
- **FR-019**: The build-along MUST read changes from the real change feed of the provided local source database container, not from a simulated source. Increments 1 and 2 MUST each be checked live by running the learner's listener in place of the connector (connector stopped, listener started in the Connect container) and showing the RepAgent login (increment 1) and the parsed commands (increment 2) from a row written to the lab database; from increment 3 on the check shows events in Kafka. Feasibility of this check was shown with the finished project's stand-in listener (`lab/experiments/live-check-feasibility.sh`, evidence 34); the increments themselves are not built yet. *(Constitution: Principle I, II)*
- **FR-020**: The pipeline taught MUST guarantee at-least-once delivery: no committed change is lost after a crash or restart, and duplicates are possible. The article MUST demonstrate this with a restart experiment and show how to detect and handle duplicates. *(Constitution: Principle I, II)*
- **FR-021**: The lab MUST use dedicated database accounts with only the permissions the lab needs: one login holding only `replication_role` for RepAgent administration, one login with `select`, `insert`, `update` and `delete` on the sample tables for application changes. The `sa` login MUST be used only for one-time setup (creating tables and the two accounts). Verified by `lab/env/verify-security.sh` (evidence 21). *(Constitution: Principle IV)*
- **FR-022**: Every port the lab publishes to the host MUST be bound to `127.0.0.1`, and the LTL port 11752 MUST NOT be published. Verified by `lab/env/verify-security.sh` (evidence 21), including a connection attempt from the machine's network address. *Scope: network exposure of the lab; FR-016 covers where the examples run.* *(Constitution: Principle IV)*
- **FR-023**: The passwords of the two lab accounts MUST be generated for each lab, kept in a git-ignored file, removed when the lab is reset, and absent from every tracked file and from git history. *Scope: credentials the lab creates at run time; the fixed public test values are covered by FR-010.* *(Constitution: Principle IV)*
- **FR-024**: Lab scripts that accept arguments (`set-tables.sh`, `consume.sh`, `await-event.sh`, `consume.ps1`) MUST reject input outside a strict character set, and SQL in the scripts MUST be fixed text with only generated values interpolated. *(Constitution: Principle IV)*
- **FR-025**: Container images used by the lab MUST be pinned by digest, with a version tag where one exists, and the pins MUST be verifiable against the registry with `lab/env/verify-images.sh` (evidence 20). *(Constitution: Technical Constraints; Principle V)*
- **FR-026**: TLS and SASL are out of scope for the local lab and were not performed or tested. The lab README and the article MUST say so, `plan.md` MUST record it as an exception to Principle IV, and no project document may claim that production security requirements were tested or met. *(Constitution: Principle IV, documented exception)*

### Key Entities

- **Learner**: person following the project; has a skill level and progress through modules.
- **Module**: a unit of teaching (concept, hands-on step set, experiment) with objectives and checks.
- **Step**: one action with an expected outcome and a success check.
- **Change Event**: a record of one source change, with operation type, before and after values, and ordering.
- **Evidence Record**: captured output that supports a claim in the material.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner who meets the prerequisites completes the core hands-on path, including the build-along, in under 12 hours of study, and sees their first change event within the first 4 hours.
- **SC-002**: Walkthrough check. Following Section 2 exactly as written, starting from a reset lab, produces the four events of the scripted changes (`op` values `c`, `c`, `u`, `d`) and every step's stated check matches. Verified reproducibly by `lab/experiments/section2-dry-run.sh`; the latest run is `docs/evidence/19-section2-dry-run.txt`. No claim is made about the share of learners who succeed unaided: that would need a user study, and none is planned.
- **SC-003**: Review check. Every written article section has at least two check questions, each with an answer in the article that is consistent with the evidence (counted per chapter file by the number of `class="check"` entries, and reviewed in the Principle I audit, task T057). No claim is made about learner scores.
- **SC-004**: 100% of behavior and test claims link to evidence or are marked as not run.
- **SC-005**: 100% of internal links resolve, and every setup step has a success check.
- **SC-006**: A learner can explain the end-to-end path and name three reliability concerns after finishing.

## Assumptions

- Learners know basic SQL, have used a command line, and can read and write basic Java; no prior CDC or Kafka expertise is required.
- Learners run everything on a single local machine with a container runtime.
- The existing handbook, source code, diagrams and captured evidence in this workspace are the base material.
- Production deployment on a managed platform is explained but not required to be run.
- The provided local source database container image is available to the learner under its own terms.
- Learners work in English.
- The lab runs offline on one machine, for learning, and is not exposed to the internet or to other machines on the network.
- The Confluent JDBC source connector article is a style and structure reference only; its text is not copied.
