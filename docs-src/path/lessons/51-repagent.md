---
id: 5.2
stage: log-and-repagent
order: 2
title: RepAgent, the log reader
summary: Meet RepAgent, the part of the database that reads the log and sends it on, and read its configuration and its state with the commands the lab account may run.
objectives:
  - You can say what RepAgent does and where it runs.
  - You can read its configuration (where it sends to, and how soon it retries).
  - You can tell that it has not been started yet, and say why.
prerequisites: [5.1]
prereqCheck: rs-name
noDiagramReason: The RepAgent and connector conversation is drawn in lesson 6.3, where it can be watched live.
---
## Description

**RepAgent** (Replication Agent) is a thread inside the database server. In lesson 4.1 you saw the setting that allows it (`sp_configure 'enable rep agent threads', 1`). For each replicated database it does three jobs:

1. It **reads the transaction log** from the last position it delivered.
2. It **converts the records into LTL**, the Log Transfer Language: a compact text format with one command per change (the next lessons show real ones).
3. It **sends those commands to a replication server** over a network connection and asks the receiver to confirm how far it has safely stored them.

The receiver is normally a Sybase Replication Server. In this lab it is **our connector**, which pretends to be one: that is the whole trick of the project. RepAgent is told where to connect by the script `sybase/02_repagent.sql` (shown in lesson 6.1) and the setting names that matter are:

| Setting | Meaning | In the lab |
|---------|---------|------------|
| `rs servername` | the name of the replication server in the database's interfaces file | `CDC_RS`, which points at the host `connect`, port 11752 |
| `rs username` | the login RepAgent presents | `rs_user` (a labelled local test value) |
| `retry timeout` | how many seconds RepAgent waits before it tries to connect again after the connection was lost | 60 by default |

`sp_config_rep_agent <database>, '<setting>'` prints a setting with three columns: the default, the configured value and the value in use. As the replication role, `cdc_admin` may run it, and may also run `sp_help_rep_agent`, which reports on the RepAgent thread itself. That is what the steps below do.

## Steps

### 1. Where does it send?

{{cmd:rs-name}}
{{out:rs-name}}

No default (`n/a`): the lab's setup script set `CDC_RS`.

### 2. Which login does it use?

{{cmd:rs-user}}
{{out:rs-user}}

### 3. How long does it wait before retrying?

{{cmd:retry}}
{{out:retry}}

The default of 60 seconds is in use. After the connector is registered, in lesson 6.2, the lab changes it to 10 seconds, so that RepAgent reconnects sooner after a connector restart than the 60-second default would (this is the registration script's own stated reason).

### 4. Is the RepAgent thread running?

{{cmd:process}}
{{out:process}}

Only the column headings and no row: there is **no RepAgent thread yet**. That is expected. The setup script configured RepAgent but did **not** start it, because a started RepAgent would try to connect to a connector that does not exist yet. Lesson 6.2 starts it, and you will see the same command print a row.

### 5. Has it scanned any log?

{{cmd:scan}}
{{out:scan}}

Also empty, for the same reason. Once it runs, this table shows how many log records it has read.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- RepAgent configuration values other than the three shown, and changing them.
- Starting RepAgent before the connector listens, and what it does then.
- Several replicated databases (the lab has one).
