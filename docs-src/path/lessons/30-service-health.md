---
id: 3.1
stage: health
order: 1
title: Is every service healthy?
summary: Check each of the four services with a command, and learn what "healthy" means for each one.
objectives:
  - You can check the database, Kafka, Kafka Connect and the web UI one by one.
  - You can say what a healthy answer looks like for each service.
  - You can see how much memory the lab uses.
prerequisites: [2.2]
prereqCheck: containers
diagrams: [docker-topology]
---
## Description

"Running" is not "healthy": a container can be running while the program inside is still starting or has failed. So each service gets its own check, one that talks to the program the way a real user of it would.

| Service | Healthy means | Check |
|---------|---------------|-------|
| All four containers | the container state is `running` (Kafka also reports `healthy`, because the compose file gives it a health check) | `docker inspect` |
| Kafka | the broker answers an API request | `kafka-broker-api-versions.sh` inside the container |
| Kafka Connect | the REST API answers and lists our connector plugin | `curl localhost:8083` |
| Kafka web UI | the home page answers with HTTP 200 | `curl localhost:8080` |
| Sybase ASE | a login as the lab's replication account works and shows the server and database name | `isql` through `lab/path/ase.sh` |

{{diagram:docker-topology}}

## Steps

### 1. State of the four containers

{{cmd:containers}}
{{out:containers}}

Only Kafka has a health check in the compose file, so only it prints `health healthy`. The other three are judged by the checks below.

### 2. Kafka answers

{{cmd:kafka}}
{{out:kafka}}

This is the same check the compose health check uses. The first line names the broker (`id: 1`).

### 3. Kafka Connect answers

{{cmd:connect}}
{{out:connect}}

The JSON gives the Kafka Connect version. The commit and cluster ids are different in every lab, so they are shown as placeholders.

### 4. Our connector plugin is installed

{{cmd:plugin}}
{{out:plugin}}

Kafka Connect found the connector's JAR on its plugin path and lists the connector class. Without this line, nothing you register in stage 6 would work.

### 5. The web UI answers

{{cmd:ui}}
{{out:ui}}

### 6. The database answers

{{cmd:ase}}
{{out:ase}}

The login used here is `cdc_admin`, one of the two least-privilege accounts the start script created. It reaches the server `MYSYBASE` and the database `phoenix_test`. Lesson 4.2 explains the accounts.

### 7. How much memory the lab uses

{{cmd:memory}}
{{out:memory}}

The numbers change with every run, so they are shown as placeholders. In the recorded run the four containers together used under 2 GiB, against about 7.6 GiB visible to Docker (the exact figures are in the evidence file linked below).

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- What these commands print when a service is down or still starting.
- Kafka Connect failing to resolve the Kafka host right after the start (the compose file restarts it automatically; that was not reproduced in this path).
- Health checks over TLS (see the next lesson).
