---
id: 8.2
stage: build-and-kafka
order: 2
title: How Kafka Connect loads the connector
summary: See where the JAR sits, how Kafka Connect finds it, and read the registration file key by key, with the connector's status and its effective configuration.
objectives:
  - You can say how the JAR gets onto Kafka Connect's plugin path.
  - You can read every key of the registration file and say what it controls.
  - You can ask Kafka Connect for the connector's configuration and status.
prerequisites: [8.1]
prereqCheck: jar
diagrams: [connector-lifecycle]
---
## Description

Kafka Connect finds connectors in a folder named by its worker property `plugin.path`. In the lab that is `/opt/connectors` (the property is in `connect-distributed.properties`). The JAR is on that path in two ways at once: the image build copies it into `/opt/connectors/sybase-cdc/` (`deploy/docker/Dockerfile.connect`), and the compose file mounts the repository's `plugins/` folder over `/opt/connectors`, so the file in `plugins/sybase-cdc/` is the one the worker sees. When the worker starts it scans the folder for connectors; you saw the result in lesson 3.1, where `connector-plugins` listed the connector class.

{{diagram:connector-lifecycle}}

You register a connector by posting a configuration to the REST API (lesson 6.2 did this with the script). The file the script posts is the **registration file**:

{{file:connectors/sybase-cdc-phoenix.json}}

Key by key:

- `name` ({{env:connector.name}}) is the name by which Kafka Connect knows this connector. It appears in the REST URLs and in the stored restart position.
- `connector.class` ({{env:connector.class}}) is the class Kafka Connect creates, the `SybaseCdcSourceConnector` you read in lesson 7.19.
- `tasks.max` ({{env:tasks.max}}) is `1`. The connector ignores any other value, because RepAgent connects to one host and port per database.
- `ltl.listen.port` ({{env:ltl.listen.port}}), `ltl.username` ({{env:ltl.username}}) and `ltl.password` ({{env:ltl.password}}) are what RepAgent must match: the port of the interfaces entry and the login of `sp_config_rep_agent`. The values are the labelled local test values of `sybase/02_repagent.sql`.
- `database.server.name` ({{env:database.server.name}}) and `database.name` ({{env:database.name}}) say which server and database this connector serves. A RepAgent for another database is refused.
- `topic.prefix` ({{env:topic.prefix}}) and `table.include.list` ({{env:table.include.list}}) decide where the events go and which tables are published.
- `key.converter` and `value.converter` (the JSON converter, {{env:key.converter / value.converter}}) and the two `schemas.enable` keys (`false`, {{env:key.converter.schemas.enable / value.converter.schemas.enable}}) say how a message is written to Kafka: plain JSON, no schema envelope.
- `errors.tolerance` ({{env:errors.tolerance}}) is `none`: the first error stops the task instead of skipping the record.

The other settings of the connector keep their defaults; the full list with their defaults is in the lesson on `SybaseCdcConfig` and in the values table.

## Steps

### 1. The JAR on the plugin path, on your machine

{{cmd:jar}}
{{out:jar}}

### 2. The same JAR, seen from inside the Connect container

{{cmd:in-container}}
{{out:in-container}}

### 3. Which connectors are registered

{{cmd:connectors}}
{{out:connectors}}

### 4. The effective configuration

{{cmd:config}}
{{out:config}}

This is what Kafka Connect stores and returns: the registration file's keys. **Note that the password comes back as typed**, in plain text: the REST API does not hide it. In a real deployment you would not keep a password in the registration file; Kafka Connect offers configuration providers for secrets (a general recommendation: not tried in this lab).

### 5. The status

{{cmd:status}}
{{out:status}}

The connector and its single task are `RUNNING`.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Putting a newly built JAR on the plugin path and restarting the worker (see lesson 8.1).
- Changing the registration (for example the table list) and what the running connector does with it.
- A configuration with a wrong value: the check at registration (`SybaseCdcConfig` rejects it) was not exercised in this path.
