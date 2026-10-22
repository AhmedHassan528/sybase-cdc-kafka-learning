# Implementation Plan: Hands-On CDC Learning Project (SAP/Sybase ASE to Kafka)

**Branch**: `001-cdc-learning-project` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-cdc-learning-project/spec.md`

## Summary

Produce a long-form, first-person deep-dive article (Confluent "JDBC Source Connector deep dive" style) that teaches learners to build a Sybase ASE to Kafka CDC connector step by step, backed by a runnable local lab. The article reuses the existing handbook build (`docs-src/`), connector source, evidence capture and Docker containers. New work: a one-command lab environment, six build-along increments each with tests, a verification script and a reference solution, reliability experiments (at-least-once), and a new 12-section article page (`docs/article.html`, sections as in FR-013) built beside the existing handbook, which stays unchanged.

## Technical Context

**Language/Version**: Java 17 (connector and build-along); Node.js for the existing docs build; PowerShell/Bash for lab scripts

**Primary Dependencies**: Kafka Connect API 3.8 (`connect-api`), slf4j, JUnit 5.10; Docker with images pinned by digest: ASE `datagrip/sybase` (tested 2019 build, digest only), `apache/kafka:3.8.0`, `provectuslabs/kafka-ui:v0.7.2` (evidence `docs/evidence/20-image-versions.txt`)

**Storage**: Kafka topics and Connect internal topics; ASE sample database; no other storage

**Testing**: JUnit 5 per increment (existing 11 unit tests as base); lab verify scripts that consume from Kafka and compare to expected events; link check (`docs-src/linkcheck.js`)

**Target Platform**: Learner's single local machine with Docker (Windows, macOS or Linux); article rendered as static HTML

**Project Type**: Documentation site plus a multi-module teaching lab (library-style Maven project)

**Performance Goals**: Not a performance project. Learner-facing targets only: first change event within 4 hours (SC-001); lab start from clean in under 10 minutes on a machine meeting the stated resources

**Constraints**: ASE image is large (about 9 GB on disk) and licensed by its vendor; only labelled public test credentials in the repository, lab account passwords generated and git-ignored; every published port bound to `127.0.0.1`; local and offline use, no TLS/SASL (recorded exception below); every claim backed by evidence or marked "not run"

**Scale/Scope**: 1 article (about 12 sections), 6 build-along increments, about 8 reliability and troubleshooting experiments, 1 sample database with 2 to 3 tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate (requirements it covers) | Status |
|-----------|-------------------------------|--------|
| I. Evidence-Based Claims | Every behavior claim in the article links to `docs/evidence/` or is marked "not run" (FR-004, FR-005, FR-006, FR-009, FR-014, FR-019, FR-020) | Pass: sections 1-4, 6, 8-10 written with evidence files 14-19; remaining sections still to be written under the same rule |
| II. Kafka Connect Contract Fidelity | Build-along uses only public `connect-api`; offsets commit only after acknowledgement (FR-005, FR-019, FR-020) | Not yet verified: increments 4 and 5 and the restart experiment are not built yet |
| III. Test-First for Core Logic | Each increment ships tests before its reference solution; unit suite passes before delivery (FR-017, FR-018) | Not yet verified: the increments are not built yet |
| IV. Secure by Default: verified capabilities | Least-privilege accounts (FR-021), loopback-only ports (FR-022), generated git-ignored passwords (FR-023), labelled public test values only in files (FR-010), argument checks (FR-024), secret scan (FR-010) | **Verified by running**: `lab/env/verify-security.sh` passed 78 of 78 checks (evidence 21); the PowerShell scripts were run from a clean lab (evidence 22) |
| IV. Secure by Default: TLS/SASL | "Connections MUST support TLS/SASL where the platform does" (FR-026) | **Documented exception, not verified.** TLS/SASL was not run or tested in the local offline lab. This row records a limit; it is not a security capability and gives no assurance. See Complexity Tracking |
| V. Reproducible Builds and Deliverables | Article, diagrams and lab rebuild from scripts; images pinned by digest; link check reports 0 problems (FR-003, FR-007, FR-008, FR-012, FR-015, FR-016, FR-025) | Pass so far: lab rebuilt from a clean state with scripts (evidence 19 and 22), pins verified by `lab/env/verify-images.sh` (evidence 20), link check 0 problems |

Post-design re-check: principles I, II, III and V have no violations. Principle IV has one documented exception (TLS/SASL, see below), which is a recorded limit and not a verified capability. The constitution does not allow Principle I to be waived and no exception is taken for it. The constitution text itself is unchanged by this feature, apart from a factual correction about the Git repository (K1).

## Project Structure

### Documentation (this feature)

```text
specs/001-cdc-learning-project/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── article-structure.md
│   ├── lab-increment.md
│   └── change-event.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
docs-src/                        # existing: article source and build
├── chapters/                    # existing handbook chapters (unchanged)
├── article/                     # new: the 12 article sections (FR-013), built to docs/article.html
├── build.js, linkcheck.js, publish-variant.js
└── diagrams/
docs/                            # built output (do not hand-edit)
├── index.html                   # existing handbook
├── article.html                 # new: the learning article
├── evidence/                    # captured outputs cited by the article
└── source/                      # annotated source pages
sybase-cdc-connector/            # existing: finished connector (the "answer key")
lab/                             # new: the build-along
├── env/                         # docker compose, start/reset, accounts, verify-images and verify-security scripts, sample data
├── increments/
│   ├── 01-listener/             # each has README, starter, tests, verify script
│   ├── 02-ltl-parser/
│   ├── 03-transaction-buffer/
│   ├── 04-connect-records/
│   ├── 05-acks-and-offsets/
│   └── 06-package-and-run/
├── solutions/                   # reference solution per increment
└── experiments/                 # reliability and troubleshooting scripts
sybase/                          # existing: ASE setup SQL
deploy/                          # existing: image and OpenShift templates
```

**Structure Decision**: Keep the existing handbook build and connector module as they are, and add one new top-level `lab/` directory. The finished `sybase-cdc-connector/` stays the reference implementation; increments are derived from it so the article and code cannot drift (FR-015).

## Complexity Tracking

| Exception | Why | Simpler alternative rejected because |
|-----------|-----|--------------------------------------|
| Principle IV: "Connections MUST support TLS/SASL where the platform does". TLS/SASL was not run or tested in the local offline lab. | The lab is a local, offline learning environment on one machine. Its services talk in plain text on the local Docker network and on loopback. Adding certificates and SASL users would add setup steps that teach nothing about CDC. | Testing TLS/SASL anyway: it would add infrastructure and failure modes to a learning lab without protecting anything in this setting. The article must state the limit and must not present the lab as evidence that TLS/SASL work. |

This exception is a documented limit, not a claim of compliance. Nothing in this project claims that production security requirements were tested or met.
