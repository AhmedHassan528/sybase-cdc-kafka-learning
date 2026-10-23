---
id: 8.3
stage: build-and-kafka
order: 3
title: The topics and the Kafka web UI
summary: See the topics Kafka now holds, find the one that carries the changes, and look at it in the Kafka web UI.
objectives:
  - You can list the topics and tell the connector's data topic from the internal ones.
  - You can read the topic's description.
  - You can find the topic in the Kafka web UI.
prerequisites: [8.2]
prereqCheck: topics
noDiagramReason: The lesson lists topics and shows a screenshot; the delivery flow is drawn in lesson 9.3.
---
## Description

Kafka stores messages in **topics**. Two kinds exist in the lab now:

- **Kafka Connect's own topics**: `_connect-configs` (the registered connector configurations), `_connect-offsets` (each connector's restart position, which lessons 7.22 and 9.3 look at) and `_connect-status` (task status). Plus `__consumer_offsets`, which Kafka itself uses for consumer groups.
- **The connector's data topic.** The connector names a topic from `topic.prefix`, the database and the table: `sybase.phoenix_test.payment`. Nobody created it: Kafka creates a topic when the first message is sent to it. This is the topic the changes of the `payment` table arrive in. It exists now because RepAgent sent the log records of the rows you inserted in lessons 5.1 and 7.22 as soon as it connected.

## Steps

### 1. All topics

{{cmd:topics}}
{{out:topics}}

The four internal topics and the data topic. If the data topic were missing here, no change had reached Kafka yet.

### 2. The data topic

{{cmd:describe}}
{{out:describe}}

One partition, replication factor 1 (a single broker). With one partition every event of the topic is in one order, and events of the same row are always in the same partition anyway, because they share a key. The topic id differs in every lab.

### 3. The same topic in the Kafka web UI

The web UI at `http://localhost:8080` (published by the compose file, lesson 2.1) shows the same information. This step opens the topic list in a headless Chrome and saves a screenshot, which is shown below.

{{cmd:screenshot}}
{{out:screenshot}}

{{screenshot:kafka-ui-topics}}

The list is the one of step 1, with the number of messages and the size of each topic. Click a topic in the UI to see its messages: lesson 9.2 does it after the demonstration.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Creating the topic by hand before the connector runs, or with several partitions.
- Another browser than Chrome for the screenshot.
- Topic settings such as retention and compaction (the lab uses the defaults).
