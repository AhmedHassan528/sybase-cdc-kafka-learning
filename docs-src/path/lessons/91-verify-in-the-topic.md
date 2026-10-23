---
id: 9.2
stage: demo
order: 2
title: Verify the events in the Kafka topic
summary: Prove that the three changes arrived in the right topic, in the right order, with the right amounts, first with a check that can fail, then by reading the messages and looking at them in the Kafka web UI.
objectives:
  - You can run a check that passes only if the insert, update and delete events are in the topic.
  - You can read one event and say what each field means.
  - You can find the same messages in the Kafka web UI.
prerequisites: [9.1]
prereqCheck: events
noDiagramReason: The delivery of an event to the topic is drawn in lessons 6.3 and 9.3; this lesson reads the result.
---
## Description

Lesson 9.1 made three changes in the database. If the pipeline works, the topic `sybase.phoenix_test.payment` now holds **three events with the same key**, one per change, in the order of the changes:

| Change | `op` | `before` | `after` |
|--------|------|----------|---------|
| insert | `c` (create) | `null` | the new row |
| update | `u` | the row before | the row after |
| delete | `d` | the row before | `null` |

A delete is an event with `after` set to `null`; the connector does not write a separate "tombstone" message.

The check script reads the topic and verifies exactly this: three events for the tag, operations `c`, `u`, `d` in that order, one key, and the amounts as written. It **fails**, with exit code 1, if anything differs, and it waits up to 90 seconds for the events to arrive, because RepAgent delivers a moment after the commit.

## Steps

### 1. The check

{{cmd:check}}
{{out:check}}

`PASS` is the answer to the question of this whole path. The amounts are `10` and `25.5` and not `10.00` and `25.50`: the connector writes a decimal column as a string without trailing zeros (the build-along evidence shows the same).

### 2. The events themselves

{{cmd:events}}
{{out:events}}

Read one line: the part before ` | ` is the Kafka **key**, the row's primary key `{"payment_id":"..."}` (the number differs from lab to lab). The part after it is the **value**: `op` is the operation, `before` and `after` are the row images, and `ts_ms` is a time stamp in milliseconds. All amounts and the key are strings, as the JSON converter writes what the connector gives it. Events with the same key always go to the same partition, so a consumer sees the three events of one row in order.

### 3. The same messages in the Kafka web UI

This step opens the topic's message list in a headless Chrome and saves a screenshot.

{{cmd:screenshot}}
{{out:screenshot}}

{{screenshot:kafka-ui-messages}}

The screenshot is the list of the messages of `sybase.phoenix_test.payment`. Open `http://localhost:8080` yourself, choose the topic and its **Messages** tab to look at it live.

## Troubleshooting

No failures were observed in the recorded runs. If the check ends with `gave up after ...s`, the events did not arrive in time: look at the connector status (lesson 8.2) and at RepAgent (lesson 6.3) in that order.

## Not tested

- A check that fails (for example with a tag that was never used) was not recorded in this lesson.
- Reading the topic with a consumer group, and the order of events across several partitions (the topic has one).
- Another browser than Chrome for the screenshot.
