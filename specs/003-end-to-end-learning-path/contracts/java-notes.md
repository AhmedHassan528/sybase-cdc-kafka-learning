# Contract: Java notes and the member list

## Member list (`lab/path/java-members.json`, generated)

```json
{
  "generatedFrom": "sybase-cdc-connector",
  "classes": {
    "com.phoenix.cdc.sybase.cdc.AckTracker": { "source": "sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/cdc/AckTracker.java", "members": ["<init>()", "acked(long,boolean)", "..."] }
  }
}
```
`lab/path/list-java-members.sh` compiles the module `sybase-cdc-connector` (the code that runs in the lab) in the pinned Maven image and runs `javap -p` on every class, keeping constructors and methods and dropping lambdas (`lambda$`) and bridge or synthetic methods. Nested classes are listed as their own classes.

## Notes file (`docs-src/path/java-notes/<ClassName>.md`)

```text
---
file: sybase-cdc-connector/src/main/java/com/phoenix/cdc/sybase/cdc/AckTracker.java
order: 12
---
purpose: Turns per-record Kafka acknowledgements into a safe log position ...

class: AckTracker
  Why it exists ...

method: AckTracker.<init>()
  ...
method: AckTracker.acked(long,boolean)
  ...

lines: 40-52
  Important: why the watermark only moves when ...

design: Why the position is a high-water mark, not the last record ...

env: ltl.listen.port
  Marks the use of the listen port constant at line 31 ...

fits: uses Oqid, CommittedTransaction; used by SybaseCdcSourceTask
```

Rules checked by `path-java.js` (SC-004):
- the `file` exists and the page's code equals it exactly (every character; the page's `<pre>` text equals the file);
- every class and member of the file in `java-members.json` has a `class:` or `method:` entry and no entry names something that does not exist;
- every `lines:` range is within the file;
- every `env:` name exists in `lab/path/env-values.json`, and that value's `usedBy` lists this file;
- `fits` names only classes that appear in the file's imports or in files that import this one (computed from the sources);
- `purpose` is present; `order` places the file after the files it imports.

## Java lesson page anatomy
1. Title: the file name; kind label "Java lesson n of N".
2. Purpose box, then "How it fits" with links to the used and using classes' lesson pages.
3. The code block: the unchanged file; each line a wrapped element so line numbers and note markers can be shown; copy button copies exactly the file text.
4. Notes beside the code: class and method notes in file order, marker numbers tied to the line each note points at; line notes; design notes.
5. "Environment-dependent values in this file": a table of the `env:` entries with a link to each row of the path-wide values table.
6. Links: the starter and the reference solution of the increment that builds this file (existing code pages), when there is one; previous and next Java lesson.
