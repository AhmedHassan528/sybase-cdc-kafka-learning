# Contract: Build-Along Increment

Each directory under `lab/increments/NN-name/` MUST contain:

| File | Purpose |
|------|---------|
| `README.md` | Goal, what to write, hints, expected result |
| `starter/` | Code the learner starts from (result of the previous solution) |
| `tests/` | JUnit tests that fail on the starter and pass on the solution |
| `verify.sh` / `verify.ps1` | Runs the tests and, where relevant, checks live output; exit code 0 means pass |

And `lab/solutions/NN-name/` holds the reference solution.

## Rules

- Increment N starts from solution N-1; increment 1 starts from an empty module.
- `verify` prints a clear PASS or FAIL line and, on FAIL, the first difference.
- Solutions compile and pass with `mvn test` under Java 17.
- The final solution is functionally the same as `sybase-cdc-connector/`.
