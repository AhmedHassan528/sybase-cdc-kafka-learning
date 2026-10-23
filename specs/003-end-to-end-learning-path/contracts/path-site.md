# Contract: Learning path pages, progress and checks

## URLs (relative to `docs/site/`)
| Path | Content |
|------|---------|
| `path/index.html` | overview: the nine stages, their lessons in order with status, overall progress, "continue" link, the overview diagram |
| `path/<stage-id>/<lesson-slug>.html` | one lesson page |
| `path/java/<ClassName>.html`, `path/java/pom.html` | Java lessons (stage 7) |
| `path/env-values.html` | the environment-dependent values table |
| `path/img/<name>.png` | screenshots from the running lab |
The top navigation of every page of the site gains one entry, "Learning path", linking to `path/index.html`. Nothing else on existing pages changes.

## Lesson page anatomy
1. Header (site navigation), a stage strip showing the nine stages with the current one marked, and the progress bar.
2. Title block: stage name and number, lesson number ("Lesson 3.1 of 40"), title, summary.
3. "In this lesson": objectives. "Before you start": prerequisites, each a link with its status (done or open) and the check command (the prerequisite check step).
4. Steps: for each step the command, the recorded output, what to look for, and the values that differ.
5. Diagram or image where the lesson explains a flow or structure, with a caption and a link to the step that shows the same live state.
6. Troubleshooting (observed failures) and "Not tested".
7. Evidence: link to `docs/evidence/path/<lesson-id>.txt` with its capture date.
8. "Mark this lesson complete" button, then previous and next links; "next" leads to the next lesson in order.

## Progress storage
- Key `cdc-path-progress-v1`, value `{"done":["1.1","1.2"]}`; written only on the learner's action; read with try/catch.
- The overview shows for each stage `done/total`, and overall `done/total` with a bar.
- Prerequisite status is computed from the stored list; an open prerequisite never blocks the page.
- With storage unavailable the controls still toggle for the page's lifetime and the page says that progress cannot be remembered.

## Example box (certificate lesson only)
A visually distinct box whose first line reads "Example, not run in this lab. The output below is invented for illustration." It is the only place invented output may appear.

## Check scripts (`docs-src/site-checks/`)
| Script | Proves | Exit 1 when |
|--------|--------|-------------|
| `path-lint.js` | SC-003, SC-010: every lesson has every part, ids and order valid, example rule | any part missing or invalid |
| `path-evidence.js` | SC-002: every command shown has a recorded run; every output block equals its evidence; "not run" labels counted | a command without evidence, an output that differs |
| `path-java.js` | SC-004, FR-012 | a page differs from its file, a class or method without a note |
| `path-env.js` | SC-005 | an item missing from the table or a table entry that does not exist |
| `path-diagrams.js` | SC-006 | a topic without a diagram, a diagram without a live step |
| `path-progress.js` | SC-007: mark three, reload, still three; storage blocked still reads | state lost or a page broken without storage |
| `site-unchanged.js` | SC-008: existing pages' body text equals the baseline | any difference |
| existing `links.js`, `offline.js`, `overflow.js`, `keyboard.js`, `search.js`, `contrast.js`, `print.js` | SC-009 and the site standards | as before; they walk all pages, including the new ones |
