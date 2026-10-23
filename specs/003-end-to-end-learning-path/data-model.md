# Data Model: End-to-End Learning Path

All data is built from source files at build time into static pages, plus one small record in the learner's browser. Field rules come from the spec's requirements.

## Stage
| Field | Rule |
|-------|------|
| `id` | short slug, unique (`environment`, `launch`, `health`, `database`, `log-and-repagent`, `replication`, `java`, `build-and-kafka`, `demo`) |
| `number` | 1 to 9, contiguous, fixed order (FR-002) |
| `title`, `goal` | non-empty; the goal is one sentence |
| `lessons[]` | at least one lesson |

## Lesson (front matter of `docs-src/path/lessons/<NN>-<id>.md`)
| Field | Rule |
|-------|------|
| `id` | unique, for example `3.1`; also the file name of the steps file and the evidence file |
| `stage` | an existing stage id |
| `order` | integer; lessons are shown by stage number then order; no gaps |
| `title` | 2 to 10 words |
| `summary` | one to two sentences (the description) |
| `objectives[]` | 2 to 5 items, each a "you can ..." statement |
| `prerequisites[]` | lesson ids that must be done first (all earlier than this lesson); empty only for lesson 1.1 |
| `prereqCheck` | id of a step in this lesson's steps file that tests the prerequisites; required unless there are no prerequisites |
| `diagrams[]` | diagram ids from `diagrams.json`, or `noDiagramReason` (a sentence) |
| `example` | optional, `true` only for the certificate example lesson |
| `evidence` | derived: `docs/evidence/path/<id>.txt`; required unless `example: true` |
Body headings (fixed): Description, Steps, Troubleshooting, Not tested. Troubleshooting items: symptom, cause, fix, each backed by a recorded observation id.

## Step (`lab/path/steps/<lesson-id>.json`)
| Field | Rule |
|-------|------|
| `id` | unique within the lesson |
| `run` | the command, run from the repository root in Git Bash |
| `expectExit` | integer, default 0 |
| `wait` | optional, `{ "until": "<regex>", "timeoutSeconds": N }` for services that need time |
| `mask[]` | regular expressions whose matches are replaced by a named placeholder in the comparison and in the page (`<timestamp>`, `<id>`, `<position>`) |
| `state` | optional note: `changes-state` or `destructive` |
Recorded output block (in the evidence file): command, output, exit code, elapsed seconds.

## Java note file (`docs-src/path/java-notes/<ClassName>.md`)
| Entry | Rule |
|-------|------|
| `purpose` | one paragraph, required |
| `class: <Name>` | one per class, record, interface or enum in the file; text says why it exists and what it does |
| `method: <Class>.<name>(<param types>)` | one per method and constructor listed in `java-members.json`; text says why it exists and what it does |
| `lines: <from>-<to>` | optional notes on important or non-obvious lines; numbers are within the file |
| `env: <value name>` | optional; marks a place where an environment-dependent value is used; the name must exist in the values table |
| `fits` | required; lists the classes it uses and the classes that use it (checked against the imports) |
| `design` | optional; a design decision and its reason |

## Environment-dependent value (`lab/path/env-values.json`)
| Field | Rule |
|-------|------|
| `name` | unique (for example `ltl.listen.port`, `kafka.bootstrap`, `ASE sa password`) |
| `kind` | `host`, `port`, `credential`, `database`, `topic`, `path`, `property` |
| `labValue` | the value used in the lab; a credential is the labelled local test value or the name of the file that holds it, never a real secret |
| `setIn[]` | files where it is set |
| `usedBy[]` | files that use it (Java files, scripts, compose) |
| `change` | what to change when deploying elsewhere, in one or two sentences |

## Diagram (`docs-src/path/diagrams.json`)
| Field | Rule |
|-------|------|
| `id` | unique |
| `topic` | one of `docker`, `log-capture`, `repagent`, `connector`, `kafka-delivery`, `overview` |
| `source` | an existing SVG under `docs/diagrams/src/svg/` or a new SVG under `docs-src/path/diagrams/` |
| `lessons[]` | lesson ids that show it |
| `liveStep` | `<lesson-id>/<step-id>` whose recorded output shows the same state |
| `alt` | text alternative |

## Screenshot
`file`, `lesson`, `captureCommand`, `capturedAt`, `alt`; stored in `docs/site/path/img/`; produced by the screenshot script from the running lab.

## Progress record (in the learner's browser only)
`cdc-path-progress-v1` = `{ "done": ["1.1", "1.2", ...] }`. Absent or unreadable storage means no progress; the page still works.

## Relationships
Stage 1..* Lesson; Lesson 0..* Step; Lesson 0..* Diagram; Java lesson 1..1 Java note file 1..1 source file; Java note `env:` entries point at Environment-dependent values; Diagram `liveStep` points at a Step.
