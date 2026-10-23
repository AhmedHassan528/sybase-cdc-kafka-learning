# Sybase CDC Connector Constitution

## Core Principles

### I. Evidence-Based Claims
Every statement about behavior, test status, or compatibility MUST be backed by captured runtime
evidence (stored under `docs/evidence/`) or a cited vendor document. Anything not run MUST be
labelled as such (for example "NOT RUN" or "untested template"); it MUST NOT be presented as
verified. Rationale: the handbook and test reports are the project's deliverable, and false
confidence about an untested platform is the main delivery risk.

### II. Kafka Connect Contract Fidelity
The connector MUST use only the public Kafka Connect APIs (`connect-api`) and keep delivery
semantics explicit. Offsets MUST be committed only for transactions that are fully acknowledged
(see the ack tracker and transaction buffer). Source changes MUST NOT break existing connector
configuration keys without a documented migration. Rationale: silent data loss or duplication in
a CDC pipeline is not recoverable downstream.

### III. Test-First for Core Logic
Parsing, buffering, and acknowledgment logic (LTL parser, LTL values, transaction buffer, ack
tracker) MUST have JUnit 5 unit tests written before or alongside the change, and the unit suite
MUST pass before any build is delivered. Behavior that needs a live Sybase ASE or Replication
Server MUST be covered by an integration test whose output is captured as evidence, or listed as
not run (Principle I). Rationale: this logic is deterministic and cheap to test; the live
systems are not.

### IV. Secure by Default
Secrets (passwords, keys, tokens) MUST NOT be committed in source, docs, images, or deployment
manifests. Only clearly labelled local test values are allowed. Connections MUST support
TLS/SASL where the platform does, and the database account MUST follow least privilege. Releases
MUST pass a secret scan. Rationale: the handbook and image archive are shared outside the team.

### V. Reproducible Builds and Deliverables
Every artifact (JAR, worker image, handbook, diagrams) MUST be rebuildable from checked-in
scripts and recorded commands (`build.sh`, `docs-src/build.js`, `Dockerfile.connect`).
Generated files MUST NOT be hand-edited; change the source and rebuild. Deliverables SHOULD
carry a checksum, and local links and anchors MUST pass the link check with zero problems.
Rationale: Git history records what changed, but only checked-in scripts and recorded commands can
reproduce a deliverable, so reproducibility is the audit trail for it.

## Technical Constraints

- Language and build: Java 17 (`maven.compiler.release`), Maven, shaded JAR.
- Runtime targets: Kafka Connect on Docker locally and OpenShift with IBM Event Streams; SAP ASE
  with SAP Replication Server (LTL) as the source.
- Dependencies MUST be pinned to explicit versions. New runtime dependencies need a stated
  reason, since they enlarge the shaded JAR.
- Deployment templates under `deploy/openshift/` stay labelled untested until run on a cluster.

## Development Workflow & Quality Gates

- Work proceeds through Spec Kit: specify, plan, tasks, implement. Specs and plans MUST name the
  affected principles when they touch them.
- A change is done only when: unit tests pass, affected evidence is refreshed or flagged stale,
  affected handbook chapters are rebuilt, and the link check reports zero problems.
- Test status in reports MUST list PASS, PARTIAL, and NOT RUN counts separately.
- The workspace is a Git repository, so Git history records changes; significant changes SHOULD
  still be recorded in `docs/PROGRESS.md` with the date.

## Governance

This constitution supersedes other project practices. Amendments MUST be made through the
`/speckit-constitution` command, state the reason, and update the version line below. Versioning
follows semantic versioning: MAJOR for removed or redefined principles, MINOR for added
principles or materially expanded guidance, PATCH for clarifications. Plans and reviews MUST
check compliance with the principles above, and any deviation MUST be justified in writing in
the plan's complexity or exceptions section. Principle I is non-negotiable and cannot be waived.

**Version**: 1.0.1 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-23
