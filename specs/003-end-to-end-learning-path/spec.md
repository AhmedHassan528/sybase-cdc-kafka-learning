# Feature Specification: Sybase ASE CDC Connector, End-to-End Learning Path

**Feature Branch**: `003-end-to-end-learning-path` (no branch created; work stays on `main`)

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Build a Sybase ASE CDC Connector, End-to-End Learning Path. Add a new, hands-on learning path to the existing CDC Connector website while keeping the current content unchanged. Teach learners how to build a custom Sybase ASE CDC Connector from scratch and run the entire pipeline locally using a Docker-based lab containing all required images, tools and services, including Maven, Kafka, Sybase ASE and the connector environment. Sequential stages: Docker installation and environment setup, launching containers, verifying service health and certificates, configuring the database and users, understanding syslogs and RepAgent, setting up the replication mechanism, implementing the Java connector, integrating it with Kafka. Every step is a self-contained lesson with a title, description, objectives, prerequisites, commands, expected output, troubleshooting tips and relevant images or architecture diagrams. Each Java file is displayed on the page with its filename, purpose, a detailed explanation and commented code; important lines and design decisions are explained; environment-dependent values are identified and what to change per environment. Diagrams, screenshots and visual explanations for Docker architecture, Sybase transaction-log capture, RepAgent communication, connector processing and Kafka delivery. Progressive stages with navigation and completion indicators. It culminates in a complete, verifiable end-to-end demonstration: launch, configure Sybase, insert or update a record, capture it through the custom connector, verify the event in the correct Kafka topic."

**Principles touched**: I (every command, output, number and screenshot in a lesson comes from a real run, and anything not run is labelled so), IV (no secrets in lessons; credentials shown are the labelled local test values; TLS and certificates must be described as the lab really is), V (the path is generated from checked-in sources by a recorded command; the existing site content is unchanged).

## Clarifications

### Session 2026-10-23

- Decision during implementation (analysis finding F1): the Java lessons show and explain the finished connector in `sybase-cdc-connector/` (19 Java files and its pom.xml), because that is the code that builds the JAR the lab runs. It differs from the build-along reference solution (`lab/solutions/06-package-and-run`) only in the comments and logging of three files and in one extra tool class (`LtlProbe`); evidence 38 lists the differences, and the Java lessons say so.
- Q: How detailed should the explanation of each Java file be? → A: Option B, every class and method. Each file gets a purpose statement, a short note for every class and every method saying why it exists and what it does, line-level notes where a line is not obvious, and a "how it fits" note. Every environment-dependent value in the file is marked.
- Q: In the database configuration lessons, should the learner type the setup commands against an unconfigured database, or should the lessons explain and inspect the setup the lab already does automatically? → A: Option A, inspect only. The lab sets itself up as it does today; the lessons explain each setup script and give commands that check the result. No new "bare" start mode is added to the lab.
- Q: Should the lab gain real TLS certificates so the health lesson can verify them, or only inspect the real certificate-free state? → A: Neither of those as real work: the certificates part is an example. Service health is verified for real; certificate checking is shown as an illustrative example, clearly labelled "example, not run in this lab", with no real TLS added to the lab and no certificate output presented as captured.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Walk from an empty machine to a verified event in Kafka (Priority: P1)

A learner who knows basic SQL and a command line opens the learning path and follows it stage by stage: set up Docker, start the lab containers, check that every service is healthy, understand and check the database setup the lab performs (database, tables, users, replication), start the connector, change a record, and see the resulting event in the right Kafka topic. At the end they have run the whole pipeline themselves and can prove it worked.

**Why this priority**: This is the point of the whole path. Without a working, verifiable end-to-end run, the explanations teach nothing the learner can confirm.

**Independent Test**: On a machine where the lab images are already pulled, follow only the lessons, in order, copying the commands as written. At the end, the changed record appears as an event in the expected topic, and the check at the end of the last lesson says so.

**Acceptance Scenarios**:

1. **Given** a learner with Docker installed, **When** they follow the stages in order and copy each command, **Then** every command succeeds and the output matches the lesson's expected output (apart from values the lesson says will differ, such as timestamps and ids).
2. **Given** the lab is running (its database already set up by the lab) and the connector is registered, **When** the learner inserts a record, updates it and deletes it as the last lesson shows, **Then** three events with the operations shown in the lesson appear in the topic named in the lesson, in order, and a check command says they are present.
3. **Given** a learner who starts a lesson without finishing the one before it, **When** they open it, **Then** the lesson's prerequisites list tells them what must be true first and gives a quick command to test that it is.
4. **Given** a lesson whose step fails, **When** the learner looks at the lesson's troubleshooting section, **Then** the failures that were actually observed while writing the lesson are listed with their symptom, cause and fix.

---

### User Story 2 - Understand how the change is captured (Priority: P2)

A learner who has the pipeline running wants to know what is actually happening: where the database records changes (the transaction log and the system log), what RepAgent is, how it talks to the connector, how the connector turns a committed transaction into a Kafka message, and how delivery is confirmed back to the database. Dedicated lessons with diagrams, and with commands that show each part live, explain this in the order the data travels.

**Why this priority**: Running commands without understanding does not teach how to build a connector; the explanation is what turns the run into learning.

**Independent Test**: After the run in story 1, read the capture lessons and run their inspection commands. For each of the five diagram topics the learner can point at the live evidence (a log line, a status output, an offset) for the step the diagram shows.

**Acceptance Scenarios**:

1. **Given** the running lab, **When** the learner runs the inspection commands of the log lesson, **Then** they see the live state the lesson describes (for example the replicated tables and the state of the transaction-log reader) and the lesson explains each part of the output.
2. **Given** the diagram of RepAgent communication, **When** the learner follows it with the connector log open, **Then** each numbered step of the diagram matches a message or log line they can find, and the lesson names which.
3. **Given** the Kafka delivery lesson, **When** the learner reads the stored position and the acknowledgement that goes back to the database, **Then** they can explain why a restart can produce a duplicate but never a loss.

---

### User Story 3 - Read the connector's Java code, file by file, with explanations (Priority: P2)

A learner reads the connector's source in the order it is built. Each Java file is shown in full on its own lesson page: the file name, why the file exists, a detailed explanation of the important lines and design decisions, why each class and method is there, and how it works with the classes around it. The code itself is the real file with its own comments. Values that depend on the environment (hostnames, ports, credentials, database names, topic names, paths, configuration properties) are called out in each file and gathered in a table that says what to change when deploying elsewhere.

**Why this priority**: The user asked that the code be taught on the page, not offered as a download. It is the "implementing the Java connector" stage and it is what makes the path a build-from-scratch path.

**Independent Test**: Open any one Java lesson. It shows the whole file, states its purpose, explains its key lines, lists the environment-dependent values in that file, and links to the classes it uses and the classes that use it.

**Acceptance Scenarios**:

1. **Given** any Java file of the connector, **When** the learner opens its lesson, **Then** the page shows the filename, a purpose statement, the full code, an explanation of the important lines and design choices, and a "how it fits" note with links to the neighbouring classes.
2. **Given** a file that holds an environment-dependent value, **When** the learner reads its lesson, **Then** the value is marked in the explanation, the page says where the value comes from and what to change for another environment, and the same value appears in the path-wide table of environment-dependent values.
3. **Given** the code shown on a lesson page, **When** it is compared with the file in the repository, **Then** it is identical, character for character (the explanations sit beside the code, not inside it).
4. **Given** the learner has read the files in order, **When** they open the final "how the classes work together" lesson, **Then** one diagram and one walkthrough follow a single change through every class from the listener to the Kafka record and the acknowledgement.

---

### User Story 4 - Follow the journey with navigation and progress (Priority: P3)

A learner sees the path as a sequence of stages with the lessons under each stage, always knows where they are and what is next, can mark lessons complete, and sees how much of the path is done. They can leave and come back later and find their progress, and they are guided to the next lesson rather than into an isolated lab.

**Why this priority**: It keeps the journey sequential and motivating, but the lessons are usable without it.

**Independent Test**: Mark three lessons complete, reload the page and reopen it later in the same browser: the three lessons are still marked, the overall progress shows 3 of N, and the "next" control leads to the first unfinished lesson.

**Acceptance Scenarios**:

1. **Given** the path overview, **When** the learner opens it, **Then** the stages and lessons are listed in order with the number of lessons per stage and a completion state for each.
2. **Given** a lesson, **When** the learner marks it complete, **Then** the mark is shown on the lesson, in the overview and in the progress summary, and it is still there after reloading the page.
3. **Given** a learner who opens a later lesson directly, **When** earlier lessons are not marked complete, **Then** the page shows which earlier lessons are open and links to the first one, without blocking access.
4. **Given** browser storage that is unavailable or cleared, **When** the learner opens the path, **Then** every lesson still reads and works; only the remembered progress is missing.

---

### Edge Cases

- A learner skips stages and starts at the Java lessons: each lesson's prerequisite check tells them what is missing before they run anything.
- Docker is installed but not running, or ports needed by the lab are already in use: the environment lessons list these as observed failures with the command that shows them.
- The ASE image is large and the first pull is slow or runs out of disk: the lesson states the disk and memory the lab needs (as measured) and how to check them first.
- A service is not healthy yet when the next command runs (for example the database is still starting): the lessons use a wait-and-check command, and the troubleshooting section says how long the wait took in the real run.
- RepAgent reports no activity right after the connector restarts: the lesson explains the waiting period seen in the lab and how to confirm the pipeline is only waiting.
- The learner runs the demonstration twice: the lesson says which parts can be repeated and what happens to existing rows and events.
- Operating systems other than the one the path was run on: commands for them are shown only if they were run; otherwise they are labelled "not run" and point to the vendor documentation.
- The learner deploys to another environment: the table of environment-dependent values is the only place they must look, and it covers every value the connector reads.
- A lesson's command output differs from the expected output in a value that is expected to change (ids, timestamps, positions): the lesson names those values so the learner knows what to ignore.
- Browser storage cleared: progress is lost, content is unaffected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST offer a dedicated learning path with its own entry in the top navigation, as an addition to the existing site. All existing pages and their text MUST stay unchanged; a comparison against the current build MUST show no difference in them (apart from the added navigation entry). (US4; Principle V)
- **FR-002**: The path MUST be organised in sequential stages in this order: environment setup (Docker), launching the containers, verifying service health, understanding and checking the database configuration and its users, understanding the system log and RepAgent, understanding and checking the replication setup, implementing the Java connector, integrating with Kafka, and the end-to-end demonstration. Each stage MUST contain one or more lessons. (US1, US4)
- **FR-003**: Every lesson MUST contain: a title, a description, objectives, prerequisites (with a command that tests them), the commands to run, the expected output, troubleshooting tips, and at least one diagram or image where the lesson explains a structure or a flow. A lesson without a diagram MUST say in the check list why none applies. (US1)
- **FR-004**: Every command shown MUST have been run in the lab while the lesson was written; the expected output shown MUST be the captured output, with values that change from run to run named as such. Any command or step not run MUST be labelled "not run" and MUST NOT be presented as verified. Each lesson MUST link to the evidence file that holds the captured run. (US1; Principle I)
- **FR-005**: The troubleshooting tips of a lesson MUST list only failures that were observed in the lab, each with symptom, cause and fix, plus a clearly separated list of known limits that were not tested. (US1; Principle I)
- **FR-006**: The environment lessons MUST cover installing and checking Docker, the resources the lab needs (measured), starting the containers, and checking that each service is up, using commands that were run. Installation steps for operating systems other than the one used in the run MUST be labelled "not run". (US1)
- **FR-007**: The service-health lesson MUST check every service of the lab (database, message broker, Kafka Connect, web UI) for real, state what "healthy" means for each, and use the checks that were run. Certificates MUST be covered as an example only: a clearly labelled "example, not run in this lab" part shows what checking a service certificate looks like (the commands a learner would run against a TLS-enabled service and what a good and a bad result mean), using illustrative output that is marked as invented. The lesson MUST state that the lab itself has no TLS or certificates, MUST NOT present any certificate output as captured, and no TLS is added to the lab. (US1; Principles I, IV)
- **FR-008**: The database lessons MUST explain, script by script, the setup the lab performs automatically when it starts (the database, its tables, its least-privilege users, and switching replication on for a table), and MUST give commands that check the result, with their captured output. The lab's automatic start stays as it is; no new unconfigured start mode is added. The credentials shown MUST be the labelled local test values only. (US1; Principle IV)
- **FR-009**: The capture lessons MUST explain, with live inspection commands, the transaction log, the system error log, RepAgent (what it reads, how it is started and configured, how it reports its state) and the messages it sends to the connector, in the order the data travels. (US2)
- **FR-010**: The path MUST include diagrams for: the Docker architecture of the lab, transaction-log capture in the database, RepAgent communication with the connector, connector processing of a transaction, and Kafka message delivery with the acknowledgement back to the database. Each diagram MUST be tied to the live evidence for the same steps (log line, status output or stored position). Where a screenshot helps, it MUST be taken from the real running lab. (US2; Principle I)
- **FR-011**: For every Java file of the finished connector (`sybase-cdc-connector/`, the code that runs in the lab) the path MUST provide one lesson page that shows: the filename, a purpose statement, the complete code, a short note for every class and every method saying why it exists and what it does, line-level notes on the important or non-obvious lines and the design decisions, and how the file works with the others (links to the classes it uses and is used by). Every class and every method in the file MUST have a note. The pom.xml that builds the JAR MUST get the same treatment. (US3)
- **FR-012**: The code shown on a lesson page MUST be identical to the repository file. The explanations MUST be placed beside the code (numbered notes that point at lines), not edited into it. A check MUST fail if any page differs from its file. (US3; Principles I, V)
- **FR-013**: Each Java lesson MUST mark every environment-dependent value in its file, state where the value comes from and what to change for another environment. The path MUST also have one table of all environment-dependent values covering hostnames, ports, credentials, database names, topic names, file paths and configuration properties, with for each: the value used in the lab, where it is set, which files use it, and what to change when deploying elsewhere. Every configuration key the connector reads MUST appear in the table. (US3)
- **FR-014**: The Java lessons MUST be ordered so that each file is explained after the files it depends on, and a closing lesson MUST show how the classes work together with a diagram and a walkthrough of one change from the listener to the Kafka record and the acknowledgement. (US3)
- **FR-015**: The path MUST show how to build the connector JAR and load it into Kafka Connect, with the command run and its captured result, and how to register the connector and check its status. (US1, US3)
- **FR-016**: The final stage MUST be an end-to-end demonstration that a learner can run completely: start the environment, check the database setup, change a record (insert, update, delete), and verify with a provided check that the matching events are in the correct Kafka topic with the key and operation each lesson states. The demonstration MUST be run in full when the path is written and its output recorded. (US1; Principle I)
- **FR-017**: The path MUST show progress: an overview of stages and lessons in order, the learner's position, a way to mark a lesson complete, an overall progress summary, and a control that leads to the next unfinished lesson. Progress MUST be kept only in the learner's own browser and the lessons MUST work without it. (US4)
- **FR-018**: Each lesson MUST show which earlier lessons it depends on, link to them, and show whether they are marked complete, without blocking access to the lesson. (US4)
- **FR-019**: The path MUST meet the same standards as the existing site: it works offline from a folder of files, in light and dark themes, from 320 px wide up, with keyboard-operable controls, and its internal links all resolve. (Principle V)
- **FR-020**: The path MUST be generated from checked-in sources by a recorded command, with the lesson content, the diagrams and the explanations kept as source files and the pages generated from them; generated pages MUST NOT be edited by hand. (Principle V)
- **FR-021**: The path MUST NOT contain secrets: only the labelled local test values may appear, and the repository secret scan MUST pass. (Principle IV)

### Key Entities

- **Stage**: a named group of lessons in a fixed order (for example "Launch the containers"); has a number, a title, a goal and its lessons.
- **Lesson**: one self-contained page with the parts listed in FR-003; belongs to one stage; has prerequisites (earlier lessons), commands, expected output, evidence link, troubleshooting items and diagrams.
- **Java lesson**: a lesson for one source file or the build file; has the filename, purpose, the code, numbered line notes, neighbouring-class links and a list of environment-dependent values.
- **Environment-dependent value**: a value that changes per environment; has a name, the lab value, where it is set, the files that use it, and what to change.
- **Diagram**: an image tied to one flow or structure and to the live evidence for it.
- **Progress record**: the set of lessons a learner marked complete; kept only in the learner's browser.
- **Evidence file**: the captured output of the run behind a lesson.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a machine where Docker is installed and the lab images are already pulled, a learner who copies the commands as written reaches a verified event in the correct topic in under 20 minutes of machine time. Measured by a scripted run of the whole path, recorded as evidence.
- **SC-002**: 100% of commands shown in the lessons, except the ones inside parts labelled "example, not run" (the certificate example), were executed in the lab, and every expected-output block equals the captured output apart from the values the lesson names as variable. Checked by a script that re-runs the commands and compares; anything not run is counted and labelled.
- **SC-003**: 100% of lessons contain all required parts (title, description, objectives, prerequisites with a check command, commands, expected output, troubleshooting, diagram or stated reason). Checked by a script over the lesson sources.
- **SC-004**: 100% of the connector's Java files and the pom.xml have a lesson page with purpose, explanation and "how it fits"; 100% of the classes and methods in those files have a note (checked by a script that lists them from the source and looks for each note); and each page's code equals its repository file exactly (0 differences).
- **SC-005**: 100% of the configuration keys the connector reads, and every hostname, port, credential, database name, topic name and path the lab uses, appear in the environment-dependent values table with what to change. Checked by comparing the table with the connector's configuration definition and the lab files.
- **SC-006**: Each of the five required diagram topics (Docker architecture, transaction-log capture, RepAgent communication, connector processing, Kafka delivery) has at least one diagram, and each diagram is linked to a lesson command that shows the matching live state.
- **SC-007**: After marking 3 lessons complete and reloading, the 3 marks and the correct progress count are still shown; with browser storage blocked all lessons still read correctly.
- **SC-008**: 0 differences between the text of the existing site pages before and after this feature (apart from the added navigation entry), and all existing checks still pass.
- **SC-009**: At 320, 375, 768 and 1280 px no page of the path needs horizontal page scrolling; with the network disconnected every page displays fully; 100% of internal links resolve.
- **SC-010**: The lesson lint check (the 8 parts, a diagram or reason, evidence link, "not run" labels) passes for 100% of lessons. No claim is made about how long a learner needs or what they will understand.

## Assumptions

- The learning path is an additional section of the existing website (its own navigation entry and pages); the existing article, build-along guide, code pages, handbook and evidence index stay as they are.
- Stage 6 (replication) uses the prebuilt connector: RepAgent can only start once the connector listens, so the finished connector is registered there; stage 7 then explains the code that is running, and stage 8 rebuilds the JAR.
- The learner does not run the database setup by hand: the lab configures the database itself at start, and the path explains and checks that setup (see Clarifications).
- The lab already provides what the path needs: containers for the database, the broker, Kafka Connect and a web UI, scripts to start, configure and reset it, and a finished, tested connector. The path teaches and verifies this lab; it does not replace it. New scripts are added only where a lesson needs a check the lab does not yet have.
- "From scratch" means the learner is taken through every part of the finished connector in build order, with the exercises (starter files and tests) of the existing build-along available as an optional hands-on companion for each Java lesson. Writing every file without seeing the reference is not required by this path.
- The lab has no TLS or certificates: the services talk in plain text on the local machine, as already documented (TLS and SASL were not run). The certificates part of the request is therefore an illustrative example, as the user clarified (FR-007).
- Docker installation steps are verified on the operating system used for the run (Windows with Docker already installed: the lesson checks the installation and the resources). Steps for other systems are given as references to the vendor documentation and labelled "not run".
- The lab is a local, offline learning environment, not a production deployment; the path says so and makes no production-security claims.
- Screenshots and diagrams: diagrams are drawn from the real structure of the lab; screenshots are captured from the running lab (for example the Kafka web UI showing the topic and its messages). Anything that cannot be captured is replaced by captured text output.
- Progress is kept in the learner's browser only; no accounts, server or analytics.
- Only English is supported. The path makes no claim about how long a learner needs or how much they will understand, only about what a scripted run measures.
- Hosting is out of scope: the path is a folder of static files like the rest of the site.

## Implementation notes (2026-10-24)
- Lesson ids as built: the lesson on RepAgent talking to the connector is 6.3 (not 5.3); the Java lessons are 7.1 to 7.22 (a connector overview, 20 file lessons, and "how the classes work together"); the order of Java lessons is computed from the imports, not stored in the note files.
- FR-009: the system error log is explained in lesson 5.1 without a live command, because the log was empty in every recorded run.
