---
id: 5.1
stage: log-and-repagent
order: 1
title: The transaction log and syslogs
summary: See where Sybase writes every change first, watch the log grow when you insert one row, and learn how the lab is warned if the log fills up.
objectives:
  - You can say what the transaction log is and that its system table is named syslogs.
  - You can see the log's size and watch it grow when a row is inserted.
  - You can explain why a stopped pipeline makes the log keep records, and what the lab's alert does.
prerequisites: [4.2]
prereqCheck: log-size
diagrams: [log-capture]
---
## Description

Like other databases, ASE writes a record of each change to the database's **transaction log** as part of making the change. This is standard database design, and the evidence below shows it: the log grows when you insert a row. The log is the one place where *every* change is recorded in order. A change data capture pipeline built on the log never has to ask the tables what changed: it reads what the database already wrote.

In ASE the log of a database is a system table named **`syslogs`** that lives on the log device you saw in lesson 4.1 (`phoenix_log`, 512 MB). You can read it like a table; here we only count its records.

The picture below shows what one transaction looks like in the log (left), what RepAgent turns it into (middle, the LTL commands of the next lessons) and what the connector does with each command (right).

{{diagram:log-capture}}

**Why the log keeps records.** ASE normally frees log space at each checkpoint (the database option `trunc log on chkpt` from lesson 4.1). With replication switched on it keeps one exception: it never frees records that RepAgent has not yet read. That is called the *secondary truncation point*. The consequence is that a connector that is down or too slow makes the log fill up. The lab therefore adds a warning, `sybase/03_log_threshold.sql`:

{{file:sybase/03_log_threshold.sql}}

The `sp_addthreshold` line registers a *threshold* on the log segment: when the free log pages drop below **24576** (75% of the 32768 pages the log has, so when more than a quarter of the log is in use) ASE runs the procedure `sp_cdc_log_alert`. The procedure writes a row into the table `cdc_log_alert` and prints a message. It **only warns**: it never truncates the log, because that would throw away changes the connector has not read yet. The firing of the alert was not tested in this path.

Besides `syslogs` the server keeps a plain text **error log** (inside the container: `/opt/sybase/ASE-16_0/install/MYSYBASE.log`). It is a different thing: messages about the server and its threads, including RepAgent errors, not the changes.

## Steps

### 1. How big is the log?

{{cmd:log-size}}
{{out:log-size}}

`total_pages` is the size of the log (32768 pages, the 512 MB device). The free and used figures change all the time, so they are shown as placeholders. This was run as `sa` because `sp_spaceused` needs more than the least-privilege accounts have.

### 2. Insert one row and count the log records

{{cmd:growth}}
{{out:growth}}

The script counts the records of `syslogs` (as `cdc_admin`, which may read the log), inserts one row into `payment` (as `cdc_app`) and counts again. One single-row insert wrote the number of records printed on the last line in the recorded run; the first two numbers differ in every lab. The row has the account number `LESSON-5-1` and is a real change: when you start the connector in stage 6, it arrives in Kafka like any other.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- The log filling up, and the alert firing.
- Reading the content of the log records.
- What happens to the log while RepAgent is stopped for a long time.
