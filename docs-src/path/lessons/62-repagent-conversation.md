---
id: 6.3
stage: replication
order: 3
title: Watch RepAgent and the connector talk
summary: Follow the first conversation between RepAgent and the connector in the connector's own log, and match it to the handshake diagram.
objectives:
  - You can read the connector's log lines for listening, connecting, logging in and agreeing on a protocol version.
  - You can say what each part of the login line means.
prerequisites: [6.2]
prereqCheck: process
diagrams: [ltl-handshake]
---
## Description

The picture shows what RepAgent and the connector say to each other: first a TDS login, then agreement on the version of the log language (LTL 760), then a few questions RepAgent asks (which database user performs maintenance, where to resume from), and then the endless loop of change batches and acknowledgements.

{{diagram:ltl-handshake}}

Not every step of the picture leaves a line in the connector's normal log. The ones that do are the start of the task, the listening port, the arrival of RepAgent, the login and the version agreement. The later steps (the questions and the change batches) left no line in the connector's log in the recorded run; the connector has an `ltl.trace` setting that is off in the lab, and this path did not switch it on. So those steps are explained from the diagram and the Java lessons, and are not shown live.

## Steps

### 1. The connector's own log

{{cmd:connector-log}}
{{out:connector-log}}

Reading the lines in order:

1. `Starting Sybase CDC task for MYSYBASE.phoenix_test; last committed OQID in Kafka: none (first start)`: the task starts for the server `MYSYBASE` and the database `phoenix_test`. It looked in Kafka for the position it last delivered and found none, because this is the first start.
2. `LTL server listening on 0.0.0.0:11752`: the connector now accepts connections on every network address of its container, on port 11752. This line must appear **before** RepAgent starts.
3. `RepAgent connected from <address>`: RepAgent started and connected. The address is the database container's address on the Docker network and a port that changes every time.
4. `TDS login: TdsLogin{...}`: the login record RepAgent sent: `user=rs_user` is the login you saw configured in lesson 5.2; `server=CDC_RS` is the name RepAgent believes it is talking to; `app=Replication Agent` and `prog=CT-Library` say who is calling; `charset=iso_1` is the character set RepAgent works in (the connector then uses ISO-8859-1); `packetSize=2048` is the TDS packet size RepAgent asked for (the lowest layer, lesson 7.2, applies it); `order=LITTLE_ENDIAN` is the byte order for integers in the answers; and `capability=35B` is a block of 35 bytes in which RepAgent lists what it can do, which the connector echoes back unchanged.
5. `connect source MYSYBASE.phoenix_test proposed LTL 760 -> using 760`: RepAgent proposed LTL version 760 and the connector agreed.

### 2. RepAgent's side

{{cmd:process}}
{{out:process}}

From the database's side, the same connection is the row in the process status: `state sleeping`, `retry_count` 0 and `last_error` 0, so no errors.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- The steps of the conversation after the version agreement (they left no log line), and the `ltl.trace` setting.
- A login with the wrong user or password, and a connector that refuses the protocol version.
- The ASE error log (a text file in the database container); it was not looked at in the recorded run.
