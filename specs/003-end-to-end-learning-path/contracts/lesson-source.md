# Contract: Lesson source and steps file

## Lesson source (`docs-src/path/lessons/<NN>-<id>.md`)

```text
---
id: 3.1
stage: health
order: 1
title: Is every service healthy?
summary: One or two sentences.
objectives:
  - You can name what "healthy" means for each of the four services.
prerequisites: [2.2]
prereqCheck: containers-up
diagrams: [docker-topology]
---
## Description
...prose; may use {{cmd:<step>}} and {{out:<step>}} anywhere...

## Steps
### 1. Check the containers
{{cmd:ps}}
{{out:ps}}
What to look for: ...

## Troubleshooting
- **Symptom**: ... **Cause**: ... **Fix**: ... **Seen in**: ps
## Not tested
- ...
```

Rules checked by `path-lint.js` (SC-003):
- every front matter field of the data model is present and valid; ids and orders are unique and contiguous per stage;
- the four body headings exist in the fixed order; Steps has at least one `{{cmd:}}`; every `{{cmd:x}}` and `{{out:x}}` names a step of the lesson's steps file; every step is shown;
- every troubleshooting item has a symptom, a cause, a fix and a `Seen in` step id that exists (the observation was recorded);
- a diagram id exists in `diagrams.json`, or `noDiagramReason` is set;
- `prerequisites` are earlier lessons; `prereqCheck` is a step of this lesson (not required for `example: true` lessons, which have no steps);
- file naming: the lesson file is `<stage number><order>-<slug>.md` (lesson 3.1 is `30-...md`, 3.2 is `31-...md`; ids stay `S.L`);
- a box labelled "Example, not run" is allowed only when `example: true`, and then there is no `{{out:}}`, no evidence link and the lesson says the lab has no TLS.

Directives:
| Directive | Rendered as |
|-----------|-------------|
| `{{cmd:id}}` | a code block with the command and a copy button |
| `{{out:id}}` | a code block with the recorded output; masked values drawn as marked placeholders; exit code and elapsed time shown below |
| `{{file:path}}` | a code block with a repository file's exact text (used for the setup scripts), with notes if a notes file exists |
| `{{diagram:id}}` | the figure, with caption and a link to the live step |
| `{{screenshot:name}}` | the image from `docs/site/path/img/` with its capture date and command |
| `{{env:name}}` | an inline marker that links to the row in the values table |

## Steps file (`lab/path/steps/<lesson-id>.json`)

```json
{
  "lesson": "3.1",
  "steps": [
    { "id": "ps", "run": "docker ps --format 'table {{.Names}}\\t{{.Status}}'", "mask": ["Up [0-9]+ (seconds|minutes|hours)"] },
    { "id": "connect-root", "run": "curl -s localhost:8083/", "wait": { "until": "\"version\"", "timeoutSeconds": 60 } }
  ]
}
```

Rules:
- Commands run from the repository root in Git Bash; the runner sets nothing the learner would not have.
- A step that fails (exit code other than `expectExit`) stops the lesson's run and fails the run.
- `mask` entries are regular expressions; each match becomes a named placeholder in both the stored comparison and the page.

## Runner interface
| Command | Result |
|---------|--------|
| `bash lab/path/run-lesson.sh <lesson-id>` | runs one lesson's steps in the lab, writes `docs/evidence/path/<lesson-id>.txt`, exit 0 if every step passed |
| `bash lab/path/run-path.sh` | resets the lab, runs every lesson in order, writes the evidence files and `docs/evidence/path/_run.txt` with the total time; exit 1 on the first failure |
| `bash lab/path/verify-path.sh` | re-runs the steps and compares the masked output with the recorded evidence; exit 1 on any difference |

## Evidence file format (`docs/evidence/path/<lesson-id>.txt`)
```text
# Captured: <UTC time>
# Lesson:   3.1
# Images:   <as lab/env/capture-evidence.sh>
## step ps
$ docker ps ...
<output>
# exit 0, 0.4 s
```
