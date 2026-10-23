---
id: 4.1
stage: database
order: 1
title: The database and its tables
summary: Understand the scripts that create the source database, then check the database and the table whose changes we capture.
objectives:
  - You can say what each statement of the two setup scripts does and why the connector needs it.
  - You can check the database, its log device and the replicated table from the command line.
prerequisites: [3.1]
prereqCheck: scripts
noDiagramReason: The lesson explains two SQL scripts and inspects their result; the capture flow is drawn in stage 5.
---
## Description

You do not create the database by hand. When the database container starts for the first time, its startup script (`sybase/start.sh`) runs every file in `sybase/` in file-name order, once, and leaves a marker file so that it never runs them again. This lesson explains the first two; the other two belong to stage 5 and stage 6.

### `00_database.sql`: the database and its log

{{file:sybase/00_database.sql}}

- `disk init` creates two files on the database server's disk and registers them as devices: **`phoenix_data`** (1 GB) for the data and **`phoenix_log`** (512 MB) for the transaction log.
- `create database ... on phoenix_data ... log on phoenix_log` builds the database `phoenix_test` and puts its **transaction log on its own device**. The log is what the connector's whole pipeline is about: every change is written there first, and RepAgent reads it from there.
- The three `sp_dboption` lines set database options. `select into` allows the `select ... into` statement, and `ddl in tran` allows schema changes inside a transaction (the status column of the check below shows both are set). `trunc log on chkpt` lets ASE free log space at each checkpoint, **but only up to the point RepAgent has already delivered**: ASE keeps a "secondary truncation point" for RepAgent and never frees the part of the log that RepAgent has not read yet. This is why the lab also has an alert for the log filling up while the pipeline is behind (stage 5).

### `01_setup.sql`: the replicated table

{{file:sybase/01_setup.sql}}

- `sp_configure 'enable rep agent threads', 1` switches on **RepAgent threads** inside the database server. RepAgent is not a separate program here: it is a thread of ASE that reads the log.
- `payment` is the table whose changes we capture. Its **primary key is `payment_id`**, an identity column that the database fills in. The primary key matters later: it becomes the Kafka message key of every event for that row.
- `sp_setreptable payment, true` **marks the table for replication**. Only marked tables send their changes to RepAgent at all.
- `select @@version` only prints the server version.

## Steps

### 1. The scripts that ran at first boot

{{cmd:scripts}}
{{out:scripts}}

### 2. The database, its options and its devices

{{cmd:database}}
{{out:database}}

This was run as `sa`, the setup login (the two least-privilege accounts of the next lesson are for other jobs). Read it like this: the database is `phoenix_test`, 1536 MB in total (a 1024 MB data device plus a 512 MB log device); the `status` column lists the three options set by the script (`select into/bulkcopy/pllsort`, `trunc log on chkpt`, `ddl in tran`); and the two device lines show the data and the log on separate devices (`data only` and `log only`). Dates and the free-space figures differ in every lab, so they are shown as placeholders.

### 3. The table

{{cmd:table}}
{{out:table}}

This was run as `cdc_app`, the application account. The table `payment` has five columns, and the first, `payment_id`, is the identity column (`Identity 1`). The listing is cut after the first index: the primary key is a unique, clustered index on `payment_id`. The long numbers in the default and index names differ in every lab, so they are shown as placeholders.

### 4. Is the table marked for replication?

{{cmd:replicated}}
{{out:replicated}}

`sp_setreptable` with only a table name does not change anything: it reports the current state. `currently true` means the table is marked, and it names the primary key that the replication uses.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Re-running the setup scripts by hand against an empty server (the lab runs them itself; this path explains and checks them).
- What happens when a table has no primary key and is marked for replication.
- The `select into` and `ddl in tran` options beyond the fact that they are set.
