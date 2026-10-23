---
id: 6.2
stage: replication
order: 2
title: Register the connector, then start RepAgent
summary: Register the connector so that it starts listening, then start RepAgent so that it has something to connect to, and see the difference in RepAgent's state.
objectives:
  - You can say why the connector must be listening before RepAgent starts.
  - You can register the connector with one script and check that its task is running.
  - You can see RepAgent change from "no thread" to "sleeping".
prerequisites: [6.1]
prereqCheck: before
noDiagramReason: The start order is a two-step sequence explained in the text; the messages are drawn in lesson 6.3.
---
## Description

The order matters. **RepAgent connects to the connector as soon as it starts**, and the lab's own setup script says not to start RepAgent until the connector listens. So: first the connector, then RepAgent. What RepAgent does when the connector is not there yet was not tested in this path. `lab/env/register-connector.sh` does both in that order:

{{file:lab/env/register-connector.sh}}

1. It asks Kafka Connect whether the connector `sybase-cdc-phoenix` exists, and if not, **registers it** by posting the JSON file `connectors/sybase-cdc-phoenix.json` to the Connect REST API (lesson 8.2 explains the file key by key).
2. It waits up to 60 seconds until the connector's task reports `RUNNING`. By then the task has opened its listening port 11752.
3. It sets RepAgent's `retry timeout` to 10 seconds (so RepAgent retries sooner than the default 60, as lesson 5.2 said) and **starts the RepAgent thread** with `sp_start_rep_agent phoenix_test`.
4. It prints the connector's status.

The script is meant to be run once on a fresh lab. Running it again is safe for the registration (it says "already registered") but prints some error-looking lines from the RepAgent commands; those are known and harmless, and the script was left as it is (the lab's `run-twice` experiment, evidence 29, recorded them).

## Steps

### 1. RepAgent before the start

{{cmd:before}}
{{out:before}}

Headings only: there is no RepAgent thread (the same as at the end of lesson 5.2).

### 2. Register and start

{{cmd:register}}
{{out:register}}

Read the output top to bottom: `registered ...` (the connector was created), `ok: connector task RUNNING` (the wait ended), the table with `retry timeout ... 10` (the setting changed), the two messages from ASE (the configuration change, and `Replication Agent thread is started`), and the final status as JSON, where the connector and its one task are `RUNNING`.

### 3. The connector's status

{{cmd:status}}
{{out:status}}

`tasks` has exactly one entry. The connector always starts exactly one task, because RepAgent connects to one host and port per database (lesson 7.19 shows where the code sets this).

### 4. RepAgent after the start

{{cmd:after}}
{{out:after}}

There is a row now. `state` is `sleeping`, which is the **idle, healthy state**: RepAgent has nothing more to send at the moment. `retry_count` and `last_error` are both 0. The marker columns are positions in the log; they change as changes arrive, so they are shown as placeholders. The row you inserted in lesson 5.1 was already in the log, so RepAgent sends it as soon as it connects (you will see it in Kafka in lesson 8.3).

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Starting RepAgent before the connector listens, and what RepAgent does then.
- Running `register-connector.sh` a second time (see evidence 29 for what it prints).
- Registering the connector with a configuration that is wrong.
