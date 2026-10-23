# Build-along lab

Hands-on companion to the article in `docs/index.html`. You build a Sybase ASE to Kafka CDC
connector in six checkpoints, against the real change feed from a local ASE container.

## Prerequisites

- Docker with about 15 GB free disk and 8 GB RAM (the ASE image alone is about 9 GB)
- Docker only for the build-along (Maven runs in a container; no local Java or Maven), and Node.js 18+ only to rebuild the article
- Basic SQL, a command line, and basic Java

## Layout

| Path | Purpose |
|------|---------|
| `env/` | Start, reset and inspect the local environment (ASE, Kafka, Connect, Kafka UI) |
| `increments/NN-*/` | One checkpoint each: `README.md`, `starter/`, `tests/`, `verify` script |
| `solutions/NN-*/` | Reference solution per checkpoint. Increment N starts from solution N-1 |
| `experiments/` | Reliability and troubleshooting scripts used by the article |

## Quick start

```sh
lab/env/start.sh          # PowerShell: lab/env/start.ps1
lab/env/changes.sh        # insert, update, delete a few rows
lab/env/consume.sh        # print the events from Kafka
lab/env/reset.sh          # back to a clean state
```

All passwords in this repository are labelled local test values for the lab containers only.

## Security scope (read this before you copy anything)

This lab is a **local, offline learning environment on one machine**. It is not a production deployment and
makes no claim to meet production security requirements.

| Topic | What the lab does | What it does not do |
|-------|-------------------|---------------------|
| Network exposure | Every published port is bound to `127.0.0.1`; the LTL port 11752 is not published at all. | It is not designed to be reachable from other machines. |
| Accounts | Two dedicated ASE logins: `cdc_admin` (only `replication_role`) and `cdc_app` (DML on the sample tables). `sa` is used only for one-time setup (tables, accounts). | It does not model a full production permission set. |
| Credentials | The two account passwords are generated per lab into `lab/env/.lab-secrets` (git-ignored) and removed by `reset`. | The `sa` password (`myPassword`, the public default of the ASE image) and the connector login `rs_user`/`rs_password` are fixed, public, labelled test values that are in the repository. They protect nothing outside this lab. |
| TLS / SASL | **Not performed.** ASE, Kafka and Kafka Connect talk in plain text on the local Docker network and on loopback. | TLS and SASL for Kafka, the Connect REST API, or the ASE connection were **not tested** here. Do not read the lab as evidence that they work. |
| Input handling | Scripts that take arguments reject anything outside a strict character set; SQL in scripts is fixed text, with only generated values (timestamps, generated passwords) interpolated. | No general-purpose sanitising: the scripts are not meant to take untrusted input. |

`lab/env/verify-security.sh` tests the rows above and writes its output to `docs/evidence/21-lab-security.txt`.

## Known limits when you run a script twice

`lab/experiments/run-twice.sh` runs each setup script twice in a row on a running lab (`docs/evidence/29-run-twice.txt`).
Results: `start.sh`, `create-accounts.sh` and `set-tables.sh` pass both times. Two do not:

- `register-connector.sh` exits 0 the second time and the connector stays `RUNNING`, but it prints 3 lines that look like
  errors (the RepAgent is already running). They are harmless; I did not change the script.
- `sample-data.sh` (the second sample table) exits 1 both times in that run. The `customer` table existed already, and
  `sp_setreptable` returns a nonzero status on a table that is already marked. Run it once on a fresh lab. I did not
  change the script.
- `changes.sh` is not idempotent by design: every run writes new events.

## The website (article, build-along guide, evidence index)

`docs/site/` is the article as a website: open `docs/site/index.html` in a browser (from disk, no server and no internet needed).
It is generated; change the sources and rebuild:

```sh
npm ci --prefix docs-src            # once; needs the internet to fetch the pinned build tools
node docs-src/build.js site         # writes docs/site/ (article, build-along guide, evidence index)
bash docs-src/site-checks/run-all.sh   # the 13 validation scenarios (about 90 seconds, needs Chrome installed)
```

The build tools (Tailwind 3.4.17, marked 12.0.2, puppeteer-core 25.12.0) are pinned in `docs-src/package-lock.json` and do not
ship in the site. Results are in `docs/evidence/39` to `50`. Run on Chrome only: Edge did not launch headless through
puppeteer-core here, and other browsers, a physical printer, a screen reader and public hosting were not run.
