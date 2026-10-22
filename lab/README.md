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
