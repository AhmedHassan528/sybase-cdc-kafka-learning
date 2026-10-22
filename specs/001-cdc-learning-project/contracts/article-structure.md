# Contract: Article Structure

The article is the main deliverable (FR-013, FR-014). Output: `docs/article.html` built by `node docs-src/build.js article` from `docs-src/article/`. The engineering handbook `docs/index.html` is a separate page and is not changed.

## Required sections, in order

1. Introduction
2. Try it at home (lab setup, prerequisites, reset)
3. Source database prerequisites
4. Choosing what to capture
5. How changes are read and delivered (the six build-along increments live here)
6. Why is there no data? (troubleshooting by symptom)
7. Resetting and restarting from a chosen point
8. Message keys and topic naming
9. Data types
10. Multiple tables
11. Reliability experiments (at-least-once, duplicates)
12. Where to go from here (production notes, with "not run" labels)

## Rules

- First-person tutorial voice; one concern per section.
- Every command, config and output shown is real and links to a file under `docs/evidence/` or `lab/`.
- Anything not run is labelled "not run".
- Diagrams only where text cannot show the flow.
- Internal links resolve (`node docs-src/linkcheck.js docs <out.txt>` reports problems=0; it checks `article.html` too).
- No credentials other than labelled local test values.
