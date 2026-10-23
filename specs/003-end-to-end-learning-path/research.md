# Research: End-to-End Learning Path

Each item: Decision, Rationale, Alternatives considered. "To verify" items are confirmed by a task, not assumed (Principle I). Checked on 2026-10-23: Docker 29.6.1 and Compose 5.3.0 on Windows; the lab, the connector and the site tooling as they are in the repository.

## 1. Lesson format: Markdown with a small front matter
- **Decision**: One Markdown file per lesson in `docs-src/path/lessons/`. A front matter block holds the structured parts (id, stage, order, title, summary, objectives, prerequisites as lesson ids plus a check step id, diagrams, flags such as `example: true`). The body uses fixed second-level headings: Description, Steps, Troubleshooting, Not tested. Directives in the body, `{{cmd:<step>}}` and `{{out:<step>}}`, pull the command and its recorded output in from the steps file and the evidence. `marked` renders the Markdown.
- **Rationale**: The structure is what the spec requires of every lesson, so it must be checkable (SC-003) and Markdown with front matter is the lightest source a person can write 40 times. `marked` is already pinned.
- **Alternatives**: HTML sources like the article (harder to write, harder to lint); one JSON file per lesson (poor for long prose).

## 2. Commands and outputs: one source, one runner
- **Decision**: `lab/path/steps/<lesson-id>.json` lists the lesson's commands in order, each with an id, the command, an optional wait or retry, and a list of masks for values that change from run to run (timestamps, ids, positions). `lab/path/run-lesson.sh` runs them in the lab and writes `docs/evidence/path/<lesson-id>.txt` (a header with date, command and image versions, then one block per step: the command, the output, the exit code). The page shows the recorded output; masked values are drawn as marked placeholders and the lesson lists them under "values that differ". `verify-path.sh` re-runs the steps and compares the output after masking.
- **Rationale**: This makes FR-004 and SC-002 mechanical: the page cannot show an output that was not recorded, and a second run proves the output is reproducible apart from the named values.
- **Alternatives**: Pasting outputs into pages by hand (drifts, unverifiable); recording once and never re-running (no proof of repeatability).

## 3. Running 40 lessons in one lab state
- **Decision**: `run-path.sh` runs the lessons in stage order from a reset lab (`lab/env/reset.sh`, then the Stage 2 start), so each lesson's prerequisites really hold when its commands run. The lessons that change state (start, reset, the demo's insert, update and delete) are marked, and the lesson text says what state they leave. The total elapsed time is recorded for SC-001.
- **Rationale**: The learner follows the same order, so the run is the lesson.
- **To verify**: The whole run fits in 20 minutes with images already pulled (the existing article path took 69 s for start and first events; the Java stage needs a Maven build of about 15 s).
- **Alternatives**: Independent lessons that each reset the lab (slower and not how the learner works).

## 4. Environment lessons and operating systems
- **Decision**: The Docker lessons check the installation with commands that were run (`docker --version`, `docker compose version`, `docker info`, free disk and memory as measured) on Windows with Docker Desktop. Installation steps for macOS and Linux are given as links to the vendor documentation and labelled "not run". The resources the lab needs are measured (disk of the pulled images, memory use of the running containers) and quoted from the evidence.
- **Rationale**: Only one operating system is available here; claiming more would break Principle I.

## 5. Service health and the certificate example
- **Decision**: The health lesson checks the four services with the checks the lab already has or uses: `docker ps` health state, the Kafka broker API check from the compose healthcheck, the Connect REST root and `/connector-plugins`, an HTTP request to the Kafka web UI, and an `isql` login to ASE. The certificate lesson is a separate lesson with `example: true` in its front matter. It shows an illustrative `openssl s_client` check and a good and a bad result inside a box labelled "Example, not run in this lab. The output below is invented for illustration." The build fails if a lesson without `example: true` has such a box, or if an example box links to evidence. The lesson states that the lab itself has no TLS.
- **Rationale**: The user clarified that certificates are an example; Principle I forbids presenting invented output as captured, so the label and the build rule make that explicit and enforceable.
- **Alternatives**: Adding real TLS to the lab (ruled out by the user's answer); leaving certificates out (the user asked for them as an example).

## 6. Database lessons: explain and inspect (clarified)
- **Decision**: The lessons explain `sybase/00_database.sql`, `01_setup.sql`, `02_repagent.sql` and `03_log_threshold.sql` and `lab/env/create-accounts.sh` one script at a time (what each statement does and why), and give inspection commands that check the result (`sp_helpdb`, tables, `sp_helpuser`/logins, replicated-table flag, `sp_help_rep_agent`). The script text shown is the real file, copied at build time, with notes beside it. The lab's automatic start is unchanged.
- **Rationale**: User answer A. No new start mode is needed.

## 7. The system log, "syslogs" and RepAgent
- **Decision**: The log lesson inspects the live transaction log (the ASE system table named `syslogs`) with space and row-count commands before and after a change, and shows the ASE error log lines about RepAgent from the container. The RepAgent lessons use `sp_help_rep_agent` (state, retry timeout, last error), `sp_config_rep_agent`, and the connector's own log lines for the LTL handshake. Existing evidence (03, 08, 09, 14, 16 to 18, 28, 37) is reused only where re-run in the path run; otherwise the commands are run again.
- **To verify**: Which inspection commands the least-privilege accounts may run (evidence 21 already records the allowed set); commands that need `sa` are marked as such and run through the lab's setup helper.

## 8. Diagrams
- **Decision**: Reuse the existing SVG diagrams that are already accurate, and add new ones only for gaps. Mapping to the five required topics: Docker architecture = 08 (Docker topology); transaction-log capture = 03 (how a transaction becomes LTL commands) with 02 (data flow); RepAgent communication = 16 (LTL handshake); connector processing = 05 (connector lifecycle) and 06 (class relationships); Kafka delivery with the acknowledgement = 17 (ack watermark). A new overview diagram of the nine stages is drawn for the path index. `diagrams.json` ties each diagram to its lesson and to a step id whose output shows the same state (SC-006). SVGs are copied into the site, not redrawn.
- **To verify**: Each reused diagram still matches the lab (read against the code and the evidence); a mismatch is fixed in the diagram source or the diagram is dropped and replaced.
- **Alternatives**: Redrawing everything (cost, no gain); stock images (not accurate).

## 9. Screenshots
- **Decision**: Screenshots are taken from the running lab by a script with puppeteer: the Kafka web UI topic list and the message view of the payment topic after the demo, the Connect connector status page in the UI, and `docker ps`/terminal output is shown as captured text, not as a picture. Each screenshot lives in `docs/site/path/img/` with its capture date and the command that produced the state in its caption, and is re-taken by `run-path.sh`.
- **To verify**: Kafka web UI v0.7.2 renders in headless Chrome here (the look-review tooling already drives Chrome).
- **Alternatives**: Screen recordings (large, not diffable); mocked screenshots (violates Principle I).

## 10. The Java lessons
- **Decision**: One lesson per file of the finished connector (18 Java files) plus the pom.xml, in dependency order computed from the imports: the TDS classes, then the LTL classes, then the log-position and transaction classes, then the Connect classes, then the pom. Each lesson page shows the file unchanged inside a code block whose lines are individually wrapped so notes can point at them without changing the text (the text content equals the file, and the copy button copies exactly that). Notes live in `docs-src/path/java-notes/<ClassName>.md`: one entry per class and per method (`class:` and `method:` entries), line-range entries for important or non-obvious lines, `env:` entries that mark environment-dependent values, and a `fits:` entry listing the classes it uses and is used by. The first two are checked against `java-members.json`.
- **Rationale**: Matches the clarification (note for every class and method) and keeps the code exactly as in the repository (FR-012).
- **Alternatives**: Editing comments into the code (changes the file, breaks exactness); a downloadable file (explicitly not wanted).

## 11. Listing classes and methods for the coverage check
- **Decision**: `lab/path/list-java-members.sh` compiles the solution with the pinned Maven image and runs `javap -p` on every class, writing `java-members.json` (class, method names with parameter types, excluding compiler-generated lambdas and bridge methods). `path-java.js` requires a note for every entry and fails on a note that names something that does not exist.
- **To verify**: The `javap` output for nested classes, records and constructors maps cleanly to notes (constructors are noted with `method: <init>` or the class name).
- **Alternatives**: Regular expressions over source (miss cases); a JavaParser dependency (new dependency for one check).

## 12. The environment-dependent values table
- **Decision**: `lab/path/env-values.json` is the source: for each value the name, kind (host, port, credential, database, topic, path, property), the lab value, where it is set, the files that use it, and what to change elsewhere. `path-env.js` extracts from the repository the sets it must cover and compares: every key of the connector's `ConfigDef`, every key of `connectors/sybase-cdc-phoenix.json`, every published port and environment variable in `docker-compose.yml`, every host name and container name there, the topic prefix and topic names the demo uses, and the lab paths the scripts use. Anything not in the table fails the check; anything in the table that does not exist fails too. Credentials are shown as the labelled local test values or as the file that generates them.
- **Rationale**: SC-005 asks for 100% coverage; only a comparison can say that.

## 13. Progress and navigation
- **Decision**: A small script (a new function in `docs-src/site/client/site.js` or a separate `path.js`, under the 30 KB budget) keeps `cdc-path-progress-v1` in `localStorage`: a list of completed lesson ids. The overview shows stages with counts, each lesson a status, an overall bar and a "continue" link to the first unfinished lesson. A lesson shows its prerequisites with their status. Everything is plain links without script; all storage calls are in try/catch.
- **Rationale**: Meets FR-017, FR-018 and SC-007 and the existing site's no-script rule.

## 14. Keeping existing pages unchanged
- **Decision**: Before any change, `site-unchanged.js --record` stores a hash of each existing page's body text (article sections, guide pages, code pages, evidence index body) in `specs/003-end-to-end-learning-path/baseline/site-body-text.json`. The check recomputes and compares; the header navigation is excluded because it gains one entry. The evidence index body gains the new `path` evidence files (it lists files); that is an expected, documented difference limited to its table rows.
- **Rationale**: FR-001 and SC-008 need a comparison base.

## 15. Quality gates and volume
- **Decision**: `path-lint.js` enforces the lesson parts; the lessons are written stage by stage, each stage run for real before its text is finished; the Java note files are written class by class. The volume is the main risk: about 40 lessons and 19 note files. The task list orders the work so the stages that give a working end-to-end run (1 to 3, 8, 9 with a short explanation each) come first, then the capture lessons, then the Java stage.
- **Alternatives**: Writing all text first and running later (the text would claim outputs that were never recorded).

## 16. Hosting and other systems
- **Decision**: Out of scope, as for the existing site. Other operating systems and browsers are labelled "not run".
