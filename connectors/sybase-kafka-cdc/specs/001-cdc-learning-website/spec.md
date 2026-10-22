# Feature Specification: CDC Connector Learning Website

**Feature Branch**: `001-cdc-learning-website`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "i need to create a website look like https://www.confluent.io/blog/kafka-connect-deep-dive-jdbc-source-connector/ to learn how create connector from scratch and use as possible images and digrams and also you our past project to create a databse and image and do full simulation from database to connector cdc to kafka"

**Clarifications**:

- "Connector from scratch": the learning walkthrough includes writing the custom
  connector's own source code (a real, minimal CDC connector implementation), not just
  configuring an existing off-the-shelf connector.
- Sample database and simulation assets: built fresh for this website; no existing
  external project is being reused.
- The website itself (the article, instructions, and diagram gallery) is a static
  site — plain HTML, CSS, and JavaScript, with no framework and no server-side backend.
- The hands-on database, connector, and Kafka pipeline is **not** hosted by the
  website. The website provides a Docker image/Compose bundle and step-by-step
  instructions; the reader runs the sample database, builds and runs their own
  connector, and runs Kafka entirely on their own machine, in their own Docker
  environment. This matches this project's Windows/Docker-first constitution
  principle.

## Clarifications

### Session 2026-10-22

- Q: Does using the live simulation require the learner to sign in, or is it open to any visitor without an account? → A: Anonymous/no account — any visitor can use the walkthrough and their own local environment directly; no accounts exist anywhere in this feature.
- Q: When a reader triggers a database change in their local simulation, how quickly must the resulting Kafka message show up? → A: Within 10 seconds of triggering the change, observed in the reader's own local environment.
- Q: Should the pipeline run as a shared, centrally-hosted backend sized for concurrent web visitors, or as an environment each reader runs independently? → A: Each reader runs their own independent local environment via a provided Docker image/Compose bundle and step-by-step instructions; there is no shared backend, so no central capacity planning or cross-visitor rate-limiting is needed. The website itself is a static HTML/CSS/JS site with no framework and no server-side backend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the CDC deep-dive article (Priority: P1)

A reader visits the website and reads a structured, deep-dive style article —
modeled on the Confluent "Kafka Connect Deep Dive: JDBC Source Connector" blog post —
that explains how Change Data Capture (CDC) connectors work, broken into clear
sequential sections with diagrams illustrating each concept, and culminating in a
step-by-step guide to setting up a local Docker environment and building a minimal CDC
connector from scratch against it.

**Why this priority**: This is the core learning artifact. Without it, there is no
learning website — everything else (the Docker setup, the connector build, the local
simulation) exists to support and illustrate this article.

**Independent Test**: Can be fully tested by opening the website, navigating through
every section of the article via its table of contents, and confirming each concept is
explained with accompanying text and at least one diagram/image where a diagram is
called for — delivers value on its own even before a reader sets up Docker or writes
any code.

**Acceptance Scenarios**:

1. **Given** a reader lands on the website home page, **When** they open the deep-dive
   article, **Then** they see a table of contents covering CDC fundamentals, connector
   architecture, Sybase-specific CDC approaches, local Docker setup, and a step-by-step
   "build it from scratch" code walkthrough.
2. **Given** a reader is reading a concept section (e.g., "how the connector detects
   changes"), **When** the section describes a data flow or architecture, **Then** an
   accompanying diagram or image is shown alongside the text.
3. **Given** a reader reaches a section describing a CDC technique, **When** they read
   it, **Then** the section explicitly labels whether it is JDBC polling, incremental
   ingestion, or log-based CDC, and states the source it was verified against.

---

### User Story 2 - Set up the local Docker environment (Priority: P2)

A reader downloads/pulls the provided Docker image(s) and follows step-by-step
instructions to bring up the sample source database and a Kafka broker on their own
machine, so they have a working local environment to build and run their connector
against.

**Why this priority**: Nothing else hands-on can happen until the reader has a running
sample database and Kafka on their own machine. It depends on User Story 1 for context
but is independently valuable as a checkpoint.

**Independent Test**: Can be fully tested by following only the setup instructions and
confirming the sample database (with its seed data) and Kafka broker are both running
and reachable on the reader's machine, with no code written yet.

**Acceptance Scenarios**:

1. **Given** the reader has Docker installed, **When** they follow the setup
   instructions, **Then** the sample database and Kafka broker both start successfully
   and the instructions tell them how to verify each is running.
2. **Given** the environment is running, **When** the reader inspects the sample
   database, **Then** they see the documented schema and seed data described in the
   article.
3. **Given** the reader wants to start over, **When** they follow the provided
   reset/teardown steps, **Then** the environment returns to its original seed-data
   state with no manual cleanup required.

---

### User Story 3 - Build the connector from scratch (Priority: P2)

A reader follows the article's step-by-step code walkthrough to write a minimal,
working CDC connector themselves: a small program that connects to the sample
database running in their local Docker environment, detects row-level changes, and
publishes them to their local Kafka broker. The walkthrough explains each piece of the
connector's source code as it is introduced.

**Why this priority**: This is what fulfills "learn how to create a connector from
scratch" literally — the reader ends up with real, working connector code, not just an
explanation of one. It depends on User Story 2's environment already running.

**Independent Test**: Can be fully tested by following only the code walkthrough
section against an already-running local environment, ending with a connector that
correctly detects a manually-made change in the sample database — delivers value as a
standalone coding exercise even before the reader runs the full local simulation (User
Story 4).

**Acceptance Scenarios**:

1. **Given** the reader follows the walkthrough's steps in order, **When** they reach
   the end, **Then** they have a connector implementation that compiles/runs and
   connects to their local sample database.
2. **Given** the finished connector, **When** a row in the local sample database is
   changed, **Then** the connector detects the change and the walkthrough shows how to
   verify this (e.g., via logs or console output) before the change is wired into
   Kafka.
3. **Given** the walkthrough introduces the connector's CDC technique, **When** it
   explains why that technique was chosen over the others, **Then** it references the
   investigation described in User Story 1's architecture section, including why
   Sybase-specific log-based options were or weren't used, rather than asserting a
   choice without justification.

---

### User Story 4 - Run the full local simulation (Priority: P2)

A reader uses their own running connector (User Story 3) against their own local
Docker environment (User Story 2) to trigger a real change (INSERT, UPDATE, or DELETE)
in the sample database, and follows the website's instructions to observe the
connector capturing that change and the resulting message arriving in their local
Kafka topic — seeing the whole pipeline work end to end on their own machine.

**Why this priority**: This is what turns the article and the connector build into a
complete, observable pipeline and fulfills the request for a "full simulation from
database to connector cdc to kafka." It depends on User Stories 2 and 3 already being
done.

**Independent Test**: Can be fully tested by following only the simulation
instructions against an already-built connector and environment, triggering one change,
and confirming the resulting Kafka message appears as the instructions describe.

**Acceptance Scenarios**:

1. **Given** the local sample database's seed data, **When** the reader inspects the
   "before" state using the provided instructions/commands, **Then** they see the
   documented table structure and starting rows.
2. **Given** the reader triggers a change (e.g., an UPDATE to one row) using the
   provided instructions/commands, **When** their connector captures it, **Then** the
   resulting Kafka message appears in their local Kafka topic within 10 seconds, and
   the walkthrough shows how to inspect it.
3. **Given** the reader triggers an INSERT, an UPDATE, and a DELETE in sequence,
   **When** they inspect the resulting Kafka messages, **Then** message ordering
   matches the order the changes were triggered and no change is missing or
   duplicated.

---

### User Story 5 - Browse the architecture and data-flow diagrams (Priority: P3)

A reader (or a reviewer who wants the visual summary without reading the full article)
browses a gallery of the architecture and data-flow diagrams used throughout the site —
the sample database schema diagram, the connector pipeline diagram, and the
database-to-Kafka message flow diagram — to get oriented before or instead of reading
the full text.

**Why this priority**: Diagrams support the other stories but also stand alone as a
quick-reference; this is valuable but not required for the site to deliver its core
learning value.

**Independent Test**: Can be fully tested by opening a diagram gallery/overview page and
confirming each diagram is present, captioned, and legible on its own.

**Acceptance Scenarios**:

1. **Given** the reader opens the diagram overview, **When** the page loads, **Then**
   they see the sample database schema diagram, the end-to-end pipeline architecture
   diagram, and the message flow diagram, each with a caption explaining what it shows.

---

### Edge Cases

- What happens when a reader jumps directly to the connector build (User Story 3) or
  the simulation (User Story 4) without reading the article first? Each hands-on
  section MUST remain understandable on its own, with enough inline context (including
  a link back to the relevant article section) to follow it.
- How does the site handle a CDC technique or connector capability that cannot be
  verified against an authoritative source? It MUST be labeled as an assumption or
  unverified claim rather than presented as confirmed fact.
- What happens when a simulated database change would be ambiguous under the custom
  connector's chosen CDC technique (e.g., a DELETE under a technique that cannot
  represent deletes)? The walkthrough MUST explain the limitation rather than silently
  showing an incorrect result.
- What happens when the reader's Docker environment fails to start (e.g., port
  conflict, insufficient resources, Docker not running)? The website MUST provide
  troubleshooting instructions for the common failure cases rather than leaving the
  reader stuck with no guidance.
- What happens when the reader's connector code has a bug and doesn't detect a change?
  The walkthrough MUST include a way to verify each step in isolation (e.g., checking
  the database directly, checking connector logs) so the reader can localize the
  problem instead of only seeing a failure at the very end.
- How does the site behave for a reader on a narrow/mobile screen where diagrams are
  wide? Diagrams MUST remain legible (e.g., via zoom/scroll) rather than being cropped
  unreadably.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Website MUST present a deep-dive style article structured into sequential,
  navigable sections (introduction, CDC fundamentals, connector architecture, Sybase
  ASE-specific CDC approaches, local Docker setup, a step-by-step "build it from
  scratch" code walkthrough, and troubleshooting), comparable in depth and structure to
  the referenced Confluent blog post.
- **FR-002**: Website MUST include at least one diagram or image for every major
  concept and every pipeline stage described in the article (architecture diagram, data
  flow diagram, before/after database state).
- **FR-003**: Website MUST provide a downloadable/runnable Docker image or Compose
  bundle, built fresh for this project, that brings up a sample source database (with
  schema and seed data) and a Kafka broker on the reader's own machine, with
  step-by-step setup instructions.
- **FR-004**: Website MUST provide step-by-step instructions, including a reset/teardown
  step, that let a reader return their local environment to its original seed-data
  state and repeat the exercise.
- **FR-005**: Website's code walkthrough MUST present a custom, from-scratch CDC
  connector's source code in the sequence a reader would write it, explaining each piece
  as it is introduced, so a reader following along ends up with a working connector
  implementation that runs against their local Docker environment.
- **FR-006**: Website MUST provide step-by-step instructions for triggering a real
  INSERT, UPDATE, or DELETE against the local sample database and observing, within the
  reader's own local environment, the connector capturing that change and the resulting
  Kafka message.
- **FR-007**: Website and its instructions MUST NOT require a reader account, sign-in,
  or any shared/centrally-hosted backend; each reader's database, connector, and Kafka
  run independently on their own machine.
- **FR-008**: Website MUST explicitly label which CDC technique (JDBC polling,
  incremental ingestion, or log-based CDC) the custom connector implements, and MUST NOT
  present that technique's behavior as if it were one of the other techniques.
- **FR-009**: Website MUST NOT present an invented or unverified connector capability as
  confirmed fact; any claim that cannot be traced to an authoritative source MUST be
  visibly labeled as an assumption or limitation.
- **FR-010**: Website MUST cite the authoritative sources its content is grounded in,
  including the referenced Confluent JDBC Source Connector deep-dive article and official
  connector/platform/Sybase ASE documentation, next to the claims they support.
- **FR-011**: Website MUST provide navigation (e.g., a table of contents or section
  menu) that lets a reader jump directly to any section of the article, the Docker
  setup instructions, the code walkthrough, or the simulation instructions.
- **FR-012**: Simulation instructions MUST demonstrate transaction ordering and MUST
  show that INSERT, UPDATE, and DELETE changes each propagate to a distinct, correctly
  labeled Kafka message with no duplicates, with the resulting message appearing within
  10 seconds of the change being triggered in the reader's local environment.
- **FR-013**: Website MUST provide troubleshooting instructions for common local setup
  failures (e.g., Docker not running, port conflicts, connector failing to connect)
  rather than leaving a stuck reader without guidance.
- **FR-014**: Website MUST provide a diagram overview/gallery page listing every diagram
  used on the site with a caption describing what it shows.
- **FR-015**: Website MUST be implemented as a static site using plain HTML, CSS, and
  JavaScript, with no web framework and no server-side backend.

### Key Entities *(include if feature involves data)*

- **Article Section**: A single topic within the deep-dive (e.g., "CDC Fundamentals",
  "Connector Architecture"). Has a title, body content, an ordering position, zero or
  more associated diagrams, and zero or more source citations.
- **Diagram/Image**: A visual asset illustrating a concept or pipeline stage. Has a
  caption, the section(s) it appears in, and the pipeline stage it represents (if any).
- **Docker Environment Bundle**: The provided image/Compose definition a reader runs
  locally. Includes the sample database's schema and seed data, the Kafka broker
  configuration, and the setup/reset instructions associated with it.
- **Sample Database Schema**: The structure of the sample source database inside the
  Docker Environment Bundle (tables, columns, sample seed rows). Represents the
  "before" state for the walkthrough and simulation.
- **Connector Source Module**: The custom-built connector's own source code, presented
  piece by piece in the code walkthrough. Has an ordering position within the
  walkthrough, a description of what that piece does, and the CDC technique it
  implements.
- **Simulated Change Event**: A single INSERT/UPDATE/DELETE a reader triggers in their
  own local environment while following the simulation instructions. Has an ordering
  position (sequence/timestamp) and the affected row.
- **Simulated Kafka Message**: The resulting message produced in the reader's own local
  Kafka broker from a Simulated Change Event. Has a payload, the change event it
  originated from, and its position in the message ordering.
- **Source Citation**: A reference to an authoritative source (the Confluent article or
  official documentation) backing a specific claim in an Article Section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reader with no prior CDC knowledge can read the article start to finish
  and correctly describe, in their own words, the difference between JDBC polling,
  incremental ingestion, and log-based CDC.
- **SC-002**: A reader with Docker already installed can get the sample database and
  Kafka broker running on their own machine within 20 minutes of following the setup
  instructions.
- **SC-003**: A reader following the code walkthrough ends up with a connector that
  successfully detects a manually-made database change, verified by the walkthrough's
  own checkpoint instructions.
- **SC-004**: A reader with their environment and connector already running can trigger
  a change and observe the resulting Kafka message within 10 seconds.
- **SC-005**: 100% of pipeline stages described in the article have at least one
  accompanying diagram, verified by walking the diagram overview page against the
  article's table of contents.
- **SC-006**: 100% of factual claims about connector capabilities in the article are
  traceable to a cited source or are visibly labeled as an assumption/limitation,
  verified by spot-checking each Functional Requirement's corresponding article
  section.
- **SC-007**: A reader who triggers an INSERT, UPDATE, and DELETE in sequence observes
  the resulting Kafka messages in the same order the changes were triggered, with zero
  missing or duplicated messages, on every run.
- **SC-008**: A reader can reset their local environment back to its initial seed-data
  state using the provided instructions, with no manual cleanup, and repeat the full
  exercise.

## Assumptions

- The website itself is a static site (plain HTML, CSS, JavaScript; no framework, no
  server-side backend) per explicit instruction; all hands-on database/connector/Kafka
  activity happens in the reader's own local Docker environment, not on any server
  operated by this project.
- No reader accounts, sign-in, or shared backend exist anywhere in this feature; each
  reader's exercise is fully independent and local to their own machine, so there is no
  cross-reader concurrency or rate-limiting concern to design for.
- The reader has Docker installed and has basic command-line familiarity, consistent
  with this project's Windows/Docker-first constitution principle.
- The primary audience is a developer or data engineer with basic database and
  messaging concepts but no prior CDC-specific experience, consistent with this
  project's progressive-learning principle.
- The custom connector built "from scratch" implements JDBC polling or incremental
  ingestion rather than true transaction-log-based CDC, since log-based capture against
  Sybase ASE depends on licensed components (RepAgent / SAP Replication Server) that are
  not assumed to be available for this learning exercise; this choice is presented
  transparently per this project's constitution, not silently substituted.
- The site's content follows this project's existing constitution (honest CDC taxonomy,
  verified claims only, measurable acceptance criteria per module) rather than
  introducing a separate content standard.
- "Images and diagrams" refers to illustrative architecture/data-flow/schema diagrams
  created for this site, not photographs or decorative imagery.
- The Docker Environment Bundle's sample database schema and seed data are purpose-built
  for this project; no pre-existing external project or dataset is being reused.
