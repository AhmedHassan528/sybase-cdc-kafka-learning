---
id: 9.4
stage: demo
order: 4
title: Deploy somewhere else
summary: Use the table of environment-dependent values to see what changes when the connector runs outside the lab, and check that the table covers every value of the path.
objectives:
  - You can name the values that must change in another environment.
  - You can tell which values are lab test values and must never be reused.
  - You can run the check that compares the table with the lessons.
prerequisites: [9.3]
prereqCheck: values-check
noDiagramReason: The lesson is a table and a check; there is nothing to draw that the earlier stages do not already show.
---
## Description

Everything in this path ran with the lab's values: host names of the containers, port numbers, the labelled test passwords, the database `phoenix_test`, the topic prefix `sybase`. In another environment these change. The lessons marked each such value where it appeared; the page **Environment-dependent values** collects all of them in one table, with what each is, where it is set, and what to change:

[Open the values table](../env-values.html)

The most important groups:

- **Network names and ports**: the Sybase host and port (5000), the Kafka bootstrap address, the listener port (11752) and the host name RepAgent uses to reach the connector. In the lab these are container names; elsewhere they are real addresses and must be reachable in both directions.
- **Accounts and secrets**: the lab's `cdc_admin`, `cdc_app` and the local test pair `rs_user`/`rs_password` are generated or labelled for the lab. They must be replaced by your own accounts and secrets, with the least privilege each needs, and must not be committed.
- **Names**: database, server, table list and topic prefix decide which data the connector reads and where it writes.
- **Paths**: the plugin path of Kafka Connect and the folder of the JAR.

Security note: this path ran in a local, offline lab. Nothing here proves that a production deployment is secure. TLS for the Kafka and ASE connections and SASL authentication are discussed in the documentation but **were not run**.

## Steps

### 1. Check that the table covers the path

This step runs the check that compares every value marked in the lessons with the table.

{{cmd:values-check}}
{{out:values-check}}

The check passes when each marked value is in the table, and fails when a value is marked in a lesson but missing from it.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Running the connector in an environment other than this Docker lab.
- TLS and SASL between the components.
- `AckTracker.reset` and a reset of the stored position after changing the registration.
