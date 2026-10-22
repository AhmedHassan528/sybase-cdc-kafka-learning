# Feature Specification: Hands-On CDC Learning Project (SAP/Sybase ASE to Kafka)

**Feature Branch**: `001-cdc-learning-project`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Establish the constitution for a hands-on learning project that teaches how to build a Change Data Capture (CDC) pipeline from SAP/Sybase ASE to Apache Kafka. claude" (confirmed by the user as a request to specify the learning project itself; the constitution is out of scope here)

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

### Edge Cases

- The learner's machine lacks resources or a required component, or a download is unavailable.
- The source database is unreachable or restarts during a step.
- Large or multi-row transactions, and updates that change a key.
- A step is run twice, or run out of order.
- Documentation links or vendor pages change after publication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide concept material explaining each stage from source change to published event.
- **FR-002**: The project MUST provide ordered, hands-on setup steps with an explicit success check after each step.
- **FR-003**: The project MUST include a sample dataset and scripted changes (insert, update, delete) for the learner to run.
- **FR-004**: The project MUST show the expected event output for each scripted change.
- **FR-005**: The project MUST include guided reliability experiments, each with a stated expected result.
- **FR-006**: The project MUST include a troubleshooting section keyed by symptom.
- **FR-007**: The project MUST list prerequisites (knowledge, software, resources) before the first step.
- **FR-008**: The project MUST support resetting the environment to a clean state so any step can be repeated.
- **FR-009**: Every claim about behavior or test results MUST cite captured evidence or be marked "not run".
- **FR-010**: The project MUST contain no real credentials; only labelled local test values.
- **FR-011**: The project MUST include check questions or exercises for each major topic.
- **FR-012**: The project MUST be rebuildable from its source materials, and its links MUST resolve.

### Key Entities

- **Learner**: person following the project; has a skill level and progress through modules.
- **Module**: a unit of teaching (concept, hands-on step set, experiment) with objectives and checks.
- **Step**: one action with an expected outcome and a success check.
- **Change Event**: a record of one source change, with operation type, before and after values, and ordering.
- **Evidence Record**: captured output that supports a claim in the material.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner who meets the prerequisites completes the core hands-on path (P1 stories) in under 4 hours.
- **SC-002**: At least 90% of learners see their first change event arrive without outside help.
- **SC-003**: At least 80% of learners answer the check questions correctly after each module.
- **SC-004**: 100% of behavior and test claims link to evidence or are marked as not run.
- **SC-005**: 100% of internal links resolve, and every setup step has a success check.
- **SC-006**: A learner can explain the end-to-end path and name three reliability concerns after finishing.

## Assumptions

- Learners know basic SQL and have used a command line; no prior CDC or Kafka expertise is required.
- Learners run everything on a single local machine with a container runtime.
- The existing handbook, source code, diagrams and captured evidence in this workspace are the base material.
- Production deployment on a managed platform is explained but not required to be run.
- Licensed vendor components are available to the learner under their own terms.
- Learners work in English.
