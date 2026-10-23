---
id: 9.3
stage: demo
order: 3
title: Restart the connector and repeat the demonstration
summary: See where the connector keeps its restart position, restart it, and show that a second demonstration still arrives, then read what the project's earlier experiments found about duplicates.
objectives:
  - You can find the stored restart position and the markers RepAgent reports.
  - You can restart the connector through the REST API and see it return to RUNNING.
  - You can say why a restart can produce duplicate events and how a consumer recognises them.
prerequisites: [9.2]
prereqCheck: offsets
diagrams: [ack-watermark]
---
## Description

A pipeline is only useful if it survives a restart. The connector keeps its place in two ways:

- **In Kafka**: the position of the last transaction it published is stored in the topic `_connect-offsets` under a key with the connector name, the database and the server. The value is the OQID (the 36-byte locator of lesson 7.14) of that transaction's commit.
- **In ASE**: when the connector acknowledges a position, RepAgent may let the database truncate the log up to it.

{{diagram:ack-watermark}}

The connector acknowledges a position only after Kafka has confirmed the events before it, and it stores the position when Kafka Connect commits offsets. The consequence is the rule of the project: delivery is **at least once**. If the connector stops after publishing events but before the position is stored, RepAgent sends those transactions again after the restart and they appear twice. Every event carries the OQID of its source in `source.oqid`, so a consumer recognises a repeat by seeing the same OQID twice.

## Steps

### 1. The stored restart position

{{cmd:offsets}}
{{out:offsets}}

The key names the connector, the database and the server. The value is the OQID of the last committed transaction, shown here masked because it changes with every change.

### 2. The markers RepAgent reports

{{cmd:markers}}
{{out:markers}}

`start_marker`, `end_marker` and `current_marker` are positions in the log, as (page, row). When the three are equal, RepAgent has sent everything it has read; the process is `sleeping`, which is its resting state while it waits for new log records.

### 3. Restart the connector

{{cmd:restart}}
{{out:restart}}

HTTP 202 means the worker accepted the request. `includeTasks=true` restarts the task as well as the connector object.

### 4. Back to RUNNING

{{cmd:running}}
{{out:running}}

The command repeats until the connector and its task are `RUNNING` again.

### 5. A second demonstration after the restart

The same three changes with another tag, so the check does not mix them with the first ones:

{{cmd:change-again}}
{{out:change-again}}

### 6. The check for the second tag

{{cmd:check-again}}
{{out:check-again}}

The second demonstration passes after the restart, and with a new key (the number is one higher than in lesson 9.2).

### 7. Duplicates: what the earlier experiments found

This path did not provoke a duplicate. The build-along experiments did, and their recordings are in the repository:

- `docs/evidence/26-crash-duplicates.txt`: the Connect container was killed one second after a commit of 5 rows; after the restart, 5 of the 6 events were in the topic twice, with the same `source.oqid`.
- `docs/evidence/25-restart-connector.txt`: the container was restarted while 30 rows were being written; all 30 arrived once.

Both are recordings of those experiments, not of this lesson, and they differ by when the stop happens relative to the stored position.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Killing the connector in this path to provoke a duplicate (evidence 26 did it in the build-along).
- Restarting Kafka, ASE or the whole lab, and the time RepAgent needs to reconnect after each.
- Several restarts in a row, and changing the registration before a restart.
