---
id: 2.1
stage: launch
order: 1
title: The lab's containers
summary: Meet the four containers of the lab, what each one is for, which ports they publish, and how they find each other on the Docker network.
objectives:
  - You can name the four containers and say what each is for.
  - You can tell a port published on your machine from a port that only the other containers can reach.
  - You can say how the database finds the connector.
prerequisites: [1.2]
prereqCheck: services
diagrams: [docker-topology]
---
## Description

The lab is described by one file, `lab/env/docker-compose.yml`. It has four services:

| Service | Container | What it is for |
|---------|-----------|----------------|
| `sybase` | `cdc-lab-sybase` | The source database, SAP/Sybase ASE 16.0 SP02. It holds the `phoenix_test` database whose changes we capture. |
| `kafka` | `cdc-lab-kafka` | A single Kafka node (it is both broker and controller) that stores the change events as topics. |
| `connect` | `cdc-lab-connect` | Kafka Connect, with our connector's JAR on its plugin path. The connector is the program you will read in stage 7. |
| `kafka-ui` | `cdc-lab-kafka-ui` | A web page to look at topics, messages and connectors. |

{{diagram:docker-topology}}

All four containers sit on one Docker network and reach each other **by service name**: the connector talks to `kafka:9092`, the web UI to `connect:8083`. The ports in the table below are different: they are the ones **published on your machine** so that you can reach a service from your own shell or browser. All of them are bound to `127.0.0.1`, so nothing is reachable from other computers.

The most important link is not in the compose file. When the database starts for the first time, its startup script adds an entry named `CDC_RS` to the database's interfaces file, pointing at the host `connect` and port 11752. In Sybase terms the connector pretends to be a *Replication Server* at that address, and the database's RepAgent connects to it. Port 11752 is never published to your machine; only the other containers can reach it.

## Steps

### 1. List the services

{{cmd:services}}
{{out:services}}

### 2. See container names, host names and published ports

{{cmd:ports}}
{{out:ports}}

Read it by service: `connect` publishes 8083 (the Kafka Connect REST API), `kafka` publishes 29092 (for programs on your machine), `kafka-ui` publishes 8080 and `sybase` publishes 5000. Only `connect` and `sybase` have a `hostname` here, because other containers call them by that name (`connect` is where `CDC_RS` points).

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Changing the published ports (the values table, linked from the last lesson, says what else must change with them).
- Running the lab on a network other than the default Compose network.
