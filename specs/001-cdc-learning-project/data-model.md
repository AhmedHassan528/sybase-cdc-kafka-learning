# Data Model: Hands-On CDC Learning Project

These are the content and runtime entities from the spec. There is no database schema to design beyond the sample database used for demos.

## Content entities

### Module
- **Fields**: id, title, kind (concept | hands-on | experiment | build-along), objectives[], prerequisites[], steps[], checks[]
- **Relationships**: has many Steps; maps to one article section (FR-013); a build-along Module has one Increment
- **Rules**: every Module has at least one check (FR-011)

### Step
- **Fields**: id, module id, action (command or edit), expected outcome, success check, evidence link or "not run"
- **Rules**: every Step has a success check (FR-002) and either an evidence link or the label "not run" (FR-009)

### Increment (build-along)
- **Fields**: number (1 to 6), title, starter path, tests path, verify script, reference solution path
- **Relationships**: one-to-one with a build-along Module; increment N starts from the reference solution of N-1
- **Rules**: tests exist and fail on the starter, pass on the solution (FR-018)

### Experiment
- **Fields**: id, hypothesis, setup, expected result, observed result, evidence file
- **Rules**: expected result is written before the run; observed result must match or be explained (FR-005, FR-020)

### Evidence Record
- **Fields**: file path under `docs/evidence/`, command, capture date, environment versions
- **Rules**: referenced by Steps and Experiments; never edited by hand

## Runtime entities

### Sample Table
- **Fields**: primary key, a few typed columns (text, number, timestamp), source table name
- **Rules**: 2 to 3 tables; enabled for capture by the setup scripts in `sybase/`

### Change Event
- **Fields**: operation (insert | update | delete), table, before values (update and delete), after values (insert and update), transaction id, origin queue id, commit order
- **Rules**: one event per row change; events of a transaction are published in commit order; rolled-back transactions produce no events; duplicates after restart carry the same origin queue id (FR-020). Full shape in `contracts/change-event.md`.

### Learner Progress (not stored)
- Learners track progress through the checks; the project stores no learner data.

## State transitions

Transaction (inside the connector): `open` → `committed` → `published` → `acknowledged`; or `open` → `rolled back` (discarded). Offsets advance only on `acknowledged`.
