---
id: 6.1
stage: replication
order: 1
title: Point RepAgent at the connector
summary: Read the setup script that tells RepAgent where to send the log, see the interfaces entry it relies on, and learn how a table is marked for replication.
objectives:
  - You can say how RepAgent knows where the connector is.
  - You can say what a table needs before its changes are sent at all.
prerequisites: [5.2]
prereqCheck: interfaces
noDiagramReason: The lesson explains one script and checks two settings; the conversation itself is drawn in lesson 6.3.
---
## Description

Replication needs two things to be true. **The table must be marked for replication** (lesson 4.1 showed `sp_setreptable payment, true`; a table that is not marked sends nothing to RepAgent). And **RepAgent must know where to send what it reads**. The second one is the job of `sybase/02_repagent.sql`, which runs on the first boot of the database, after the two scripts of stage 4:

{{file:sybase/02_repagent.sql}}

- `sp_config_rep_agent phoenix_test, 'enable', 'CDC_RS', 'rs_user', 'rs_password'` switches RepAgent on for the database and gives it three things: the replication server name `CDC_RS`, the login `rs_user` and its password. As the script's comment says, `enable` also sets the *secondary truncation point*: from now on the log is held until RepAgent has delivered it.
- `sp_help_rep_agent ... 'process'` only prints the status (you ran it in lesson 5.2).
- The last statement turns `net password encryption` off. With it on, RepAgent logs in with an encrypted challenge and response that this connector does not implement; the connector checks the plain TDS login password instead. This is a **lab setting**, and the connection is not encrypted (the lab has no TLS: see the certificates lesson).

**How does `CDC_RS` become an address?** In the database's *interfaces file*. The database container's startup script (`sybase/start.sh`) appends an entry named `CDC_RS` the first time it runs. The entry says: connect to the host named `connect` on port 11752. `connect` is the name of the Kafka Connect container on the Docker network (lesson 2.1), and 11752 is the port our connector listens on.

## Steps

### 1. The interfaces entry

{{cmd:interfaces}}
{{out:interfaces}}

Both lines (`master` and `query`) point at host `connect`, port 11752. If you ever move the connector to another host or port, this entry and the connector's `ltl.listen.port` setting must change together; the values table in the last lesson lists them side by side.

### 2. The name RepAgent was told

{{cmd:rs-name}}
{{out:rs-name}}

The configured value is the name of the interfaces entry above.

### 3. The table is marked

{{cmd:reptable}}
{{out:reptable}}

`payment` is marked. To capture another table you would run `sp_setreptable <table>, true` as `sa` and add the table to the connector's `table.include.list` (lesson 8.2). The two filters are independent: the database sends only marked tables, and the connector publishes only listed ones. Marking a second table was not done in this path.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Marking another table, or a table without a primary key.
- Changing the host or port of the connector and the interfaces entry.
- RepAgent with `net password encryption` on.
