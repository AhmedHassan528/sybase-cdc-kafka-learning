# Quickstart: Validate the Learning Project

How to confirm the finished project works end to end. Details of each step live in the article and `lab/`; this guide only validates.

## Prerequisites
- Docker with about 15 GB free disk and 8 GB RAM, Java 17, Maven, Node.js
- Images pulled (ASE image is about 9 GB)

## Validation scenarios

1. **Environment**: run the lab start script in `lab/env/`. Expect: ASE, Kafka, Connect and Kafka UI all healthy; Connect REST answers on port 8083.
2. **First event (SC-001, SC-002)**: load the sample data and run the scripted insert, update and delete. Expect: one event per change visible in Kafka UI and in the consume script output.
3. **Build-along (FR-017, FR-018)**: for each increment 1 to 6, run its `verify` script on the reference solution. Expect: PASS each time; on the starter, increments fail as designed.
4. **Reliability (FR-020)**: run the restart experiment. Expect: no missing changes; duplicates, if any, share an `oqid` with the original.
5. **Rollback**: run the rolled-back transaction script. Expect: no events for it.
6. **Reset (FR-008)**: run the reset script, then repeat scenario 2. Expect the same result.
7. **Article checks (FR-009, FR-012)**: run `node docs-src/build.js article` then `node docs-src/linkcheck.js docs links.txt`. Expect problems=0, and every claim linked to evidence or labelled "not run".
8. **Secret scan (Principle IV)**: run `lab/env/secret-scan.sh`. Expect no findings except the labelled test values.
9. **Image pins (FR-025)**: see "Scenario 9" below.
10. **Lab security (FR-021 to FR-024, FR-026)**: see "Scenario 10" below.
11. **PowerShell scripts (FR-008)**: see "Scenario 11" below.

## Scenario 9: image pins (`lab/env/verify-images.sh`)

**Prerequisites**: Docker with `buildx` (the script uses `docker buildx imagetools inspect`); internet access for the registry check. The images need not be pulled, but then the script reports `local: not pulled yet`.

**Steps**:
1. From the repository root run `bash lab/env/verify-images.sh`.
2. Check the exit code (`echo $?`).

**Expected result**: exit code 0. For each of the three images (`apache/kafka:3.8.0`, `datagrip/sybase` by digest, `provectuslabs/kafka-ui:v0.7.2`) the lines `registry: digest resolves` and `local: same digest`, and for the two images that have a tag, `tag ... still points at this digest`. Reference run: `docs/evidence/20-image-versions.txt`.

**Failure behaviour** (both paths were run; output in `docs/evidence/33-verify-images-failure-paths.txt`):
- A digest that the registry does not know: `registry: DIGEST NOT FOUND` and exit code 1.
- An image in the compose file without a digest: `NOT PINNED BY DIGEST`, followed by the line, and exit code 1.
- A local image with a different digest prints `local: MISMATCH` and exits 1 (from the script; this path was not run).
- No internet: the script prints `registry: not reachable (offline?) - skipped` and does not fail because of it (from the script; this path was **not run**).

## Scenario 10: lab security (`lab/env/verify-security.sh`)

**Prerequisites**: the lab is running (`lab/env/start.sh`) and the connector is registered (`lab/env/register-connector.sh`), so the RepAgent exists; `git` and `docker` on the PATH; **Windows PowerShell (`powershell.exe`)**, because section A tests the machine's network address with it (without it that part reports a FAIL, not a skip). Side effects: it stops and starts the RepAgent once, creates and drops a scratch table `sec_probe`, and inserts and deletes one `payment` row, which produces change events.

**Steps**:
1. Run `bash lab/env/verify-security.sh`.
2. Optionally save the output: `bash lab/env/capture-evidence.sh docs/evidence/21-lab-security.txt bash lab/env/verify-security.sh`.

**Expected result**: every line starts with `PASS` or `INFO`, the last line is `RESULT: 78 passed, 0 failed` (the number rises if checks are added) and the exit code is 0. Reference run: `docs/evidence/21-lab-security.txt`.

**Failure behaviour**: a failed check prints `FAIL  <what was checked>` and, for a permission check, the first lines of the ASE error indented below it; the script continues, prints `RESULT: N passed, M failed` and exits 1. This path was exercised while developing the script (ten checks failed because of wrong message patterns, fixed before the reference run); a failing security setting itself was **not** simulated.

## Scenario 11: PowerShell scripts (`lab/experiments/powershell-path.ps1`)

**Prerequisites**: Windows PowerShell 5.1 or newer, Docker running, the images pulled. **Warning**: it runs `reset.ps1` first, which deletes the lab containers and their data, then rebuilds the lab.

**Steps**:
1. Run `powershell -NoProfile -ExecutionPolicy Bypass -File lab/experiments/powershell-path.ps1`.
2. Check the exit code (`$LASTEXITCODE`).

**Expected result**: the steps `reset`, `start` (including the line about the lab accounts), `register-connector`, `sample-data`, `changes` and `consume` run in order and show the four payment events; then `PASS: rejected` (a topic name with shell characters is refused), `PASS: cdc_admin is refused DML`, `total: N s`, `RESULT: all checks passed`, exit code 0. Reference run: `docs/evidence/22-powershell-path.txt` (66 seconds with cached images, exit code 0, `RESULT: all checks passed`).

**Failure behaviour**: a script that fails stops the run with a PowerShell error and a non-zero exit code; this was observed once during verification, when Kafka Connect failed to start and `start.ps1` ended with `TIMEOUT waiting for Kafka Connect REST answers` and exit code 1 (that log was not kept; the cause was fixed with `restart: on-failure:5` in the compose file). The two final checks print `FAIL: ...`, count the failure, and the script then prints `RESULT: N check(s) failed` and exits 1; **that path has not been run**.
