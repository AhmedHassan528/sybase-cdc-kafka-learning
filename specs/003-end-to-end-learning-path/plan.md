# Implementation Plan: Sybase ASE CDC Connector, End-to-End Learning Path

**Branch**: `003-end-to-end-learning-path` (work stays on `main`) | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-end-to-end-learning-path/spec.md`

## Summary

Add a dedicated learning path to the existing website, as new pages under `docs/site/path/` with its own "Learning path" entry in the top navigation. The path has 9 stages and about 40 lessons. Every lesson is a Markdown source file with a fixed set of parts (title, description, objectives, prerequisites with a check command, commands, expected output, troubleshooting, diagram or stated reason). Commands live once, in a per-lesson steps file; a runner executes them in the real lab and records the output, and the page shows that recorded output, so "expected output" is always a captured output. The Java stage has one lesson per source file (18 Java files plus the pom.xml), each showing the unchanged file with numbered notes beside it: a note for every class and method (checked against a list taken from the compiled classes), line notes on the important lines, a "how it fits" note and the environment-dependent values marked. One values table covers every hostname, port, credential, database, topic, path and configuration key, and is checked against the lab and the connector's configuration definition. Progress (mark complete, overall count, next unfinished lesson) is kept in the learner's browser only. The existing pages stay as they are; a check compares their body text with a baseline taken before this feature.

## Technical Context

**Language/Version**: Node.js 24 for the site build and checks (as for the existing site); bash for the lesson runner and lab scripts (Git Bash on Windows, as for the existing lab); browser JavaScript (ES2019, no libraries) for progress; Java 17 in a container only to list the compiled classes and methods.

**Primary Dependencies**: no new runtime dependency. Build-time tools already pinned in `docs-src/package-lock.json`: `marked` 12.0.2 (lesson Markdown), `tailwindcss` 3.4.17 (styles), `puppeteer-core` 25.12.0 (checks and screenshots, driving Chrome or Edge). The Maven image already pinned in the lab lists the class members with `javap`.

**Storage**: Files. Lesson sources in `docs-src/path/`; commands and values in `lab/path/`; captured runs in `docs/evidence/path/`; screenshots in `docs/site/path/img/`; progress in the learner's browser storage only.

**Testing**: Node and bash check scripts, one per success criterion, with output saved under `docs/evidence/` (see `quickstart.md`). A full scripted run of the whole path in the lab provides the captured outputs and the timing.

**Target Platform**: Static pages opened from disk or a local file server in current desktop and phone browsers; the lab itself runs on Docker. Verified here on Windows with Docker Desktop, in Chrome and Edge; other systems and browsers are *not run* (Principle I).

**Project Type**: Static content site extension (generator + content sources + lab scripts), no server.

**Performance Goals**: A scripted run of the whole path from a reset lab, with images already pulled, finishes in under 20 minutes (SC-001). The new pages add at most 400 KB of HTML per lesson page and no new script over 30 KB (size budgets, measured).

**Constraints**: Offline (no outside request at read time); existing pages unchanged in content; every command run for real, anything else labelled "not run" or "example"; no secrets (only the labelled local test values); generated files never hand-edited.

**Scale/Scope**: 9 stages, about 40 lessons (21 in the Java stage), about 3,600 lines of Java shown, one values table, 5 required diagram topics (reusing the 17 existing diagrams where they fit), 6 to 10 live screenshots.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate (requirements it covers) | Status |
|-----------|-------------------------------|--------|
| I. Evidence-Based Claims | Commands run for real and output captured by a runner (FR-004, SC-002); troubleshooting only from observed failures (FR-005); screenshots from the running lab (FR-010); the certificate lesson is a labelled example whose output is marked invented and never linked to evidence (FR-007); anything not run labelled | Pass at design; evidence is produced by the run |
| II. Kafka Connect Contract Fidelity | The connector is not changed; the lessons only explain it and show the offset and acknowledgement behaviour that evidence 37 and 26 already measured, and re-measure them in the demo | N/A for code; claims checked by the demo run |
| III. Test-First for Core Logic | No core logic changes. The checks of this feature (lesson parts, Java note coverage, values table, code exactness, unchanged existing pages) are written before the pieces they check | N/A for connector; followed for the checks |
| IV. Secure by Default | Only labelled local test values in lessons (FR-008, FR-021); secret scan in the quickstart; the lab stays plain-text local as documented. TLS/SASL stays the existing documented exception; the certificate lesson is an example and makes no security claim | Pass at design; exception unchanged |
| V. Reproducible Builds and Deliverables | Pages generated from sources by `node docs-src/build.js site`; generated files never hand-edited; checksums cover the new entry page; link check zero problems; existing pages unchanged (FR-001, FR-019, FR-020, SC-008, SC-009) | Pass at design |

Technical Constraints (constitution): dependencies pinned; no new dependency is added. Java and Maven constraints apply only to the member-listing step, which uses the already pinned Maven image.

Post-design re-check (after Phase 1): no violations. Two risks are recorded in research.md: the volume of hand-written lesson text (about 40 lessons, 19 Java note files), and that every lesson's commands must run in sequence in one lab state.

## Project Structure

### Documentation (this feature)

```text
specs/003-end-to-end-learning-path/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── lesson-source.md      # Markdown lesson format and the steps file
│   ├── java-notes.md         # note file format and the member list
│   ├── env-values.md         # values table format and its checks
│   └── path-site.md          # URLs, page anatomy, progress storage, check interfaces
└── tasks.md                  # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
lab/path/                         # commands, runner and data (the single source for commands and values)
├── steps/<lesson-id>.json        # the commands of each lesson, in order, with ids and variable-value masks
├── run-lesson.sh                 # runs one lesson's steps in the lab, writes docs/evidence/path/<lesson-id>.txt
├── run-path.sh                   # runs every lesson in order from a reset lab, records the total time
├── verify-path.sh                # re-runs and compares normalised output with the recorded evidence
├── env-values.json               # the environment-dependent values table (source)
├── java-members.json             # classes and methods of the connector, from javap (generated)
├── list-java-members.sh          # regenerates java-members.json with javap in the pinned Maven image
└── demo/                         # the end-to-end demo scripts (change a record, check the topic)

docs-src/path/
├── stages.json                   # stage order, titles, goals
├── lessons/<NN>-<id>.md          # lesson sources (front matter + Markdown)
├── java-notes/<ClassName>.md     # numbered notes per Java file (and pom.md)
└── diagrams.json                 # which diagram (existing SVG or new) belongs to which lesson and to which step shows the live state

docs-src/site/
├── build-path.js                 # reads the sources and evidence, writes docs/site/path/ pages and entries for search
├── path-lib/                     # front matter, steps and evidence readers, lesson lint, Java page renderer
└── templates/lesson.js           # lesson page shell parts (parts list, prerequisites, progress controls)

docs-src/site-checks/
├── path-lint.js                  # every lesson has every required part (SC-003)
├── path-evidence.js              # every command was run; every output block equals the recorded evidence (SC-002)
├── path-java.js                  # code equals file exactly; every class and method has a note (SC-004)
├── path-env.js                   # values table covers all config keys, ports, hosts, topics, paths (SC-005)
├── path-diagrams.js              # the five topics each have a diagram linked to a live step (SC-006)
├── path-progress.js              # progress survives reload; works with storage blocked (SC-007)
└── site-unchanged.js             # existing pages' body text equals the baseline (SC-008)

docs/site/path/                   # GENERATED, never hand-edited
├── index.html                    # overview: stages, lessons, progress
├── <stage>/<lesson>.html         # lesson pages
├── java/<Class>.html             # Java lesson pages
├── env-values.html               # the values table page
└── img/                          # screenshots from the running lab
docs/evidence/path/               # captured runs of every lesson, screenshots' capture logs
```

**Structure Decision**: Keep content as sources in `docs-src/path/` and `lab/path/`, generate pages into `docs/site/path/` with the existing site builder, and record every run under `docs/evidence/path/`. The existing build-along guide and code pages are not touched; the path links to them for the hands-on exercises of each Java lesson.

## Complexity Tracking

No constitution violations. Recorded trade-offs:

| Choice | Why | Simpler alternative rejected because |
|--------|-----|--------------------------------------|
| Commands in a steps file, run by a runner, with output pasted into pages at build time | The spec requires every expected output to be real (FR-004, SC-002) and 40 lessons will change over time | Typing outputs into lessons by hand would drift from the lab and could not be checked |
| `javap` member list for the "every class and method has a note" check | Regular expressions on Java source miss nested classes, records and generic signatures | A hand-kept list of methods would silently miss new methods |
| A baseline of the existing pages' body text for SC-008 | "Unchanged" needs something to compare against | Trusting that the generator did not touch them would be an unchecked claim |
