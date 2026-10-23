---
id: 1.2
stage: environment
order: 2
title: What the lab needs
summary: Check the repository, the images, the free disk space and the ports before you start the lab, so nothing fails halfway.
objectives:
  - You can find the lab's scripts and compose file in the repository.
  - You can see how much disk the lab images take and check that the lab's ports are free.
prerequisites: [1.1]
prereqCheck: files
noDiagramReason: The lesson checks resources; no flow or structure is explained here.
---
## Description

All commands run from the **repository root**, the folder that contains `lab/`, `sybase/` and `docs-src/`. The lab lives in `lab/env/`: `docker-compose.yml` describes the containers, and small scripts start, reset and inspect them.

The biggest item is the Sybase image. It is the Developer Edition published as `datagrip/sybase`, last built in 2019, and it runs an ASE 16.0 SP02 server. The first start downloads it; later starts do not.

## Steps

### 1. Check that you are in the repository

{{cmd:files}}
{{out:files}}

If `ls` says a file does not exist, you are in the wrong folder.

### 2. See the images and their size

{{cmd:images}}
{{out:images}}

The Sybase image alone is about 9 GB. The connector image (`sybase-cdc-connect`) is built locally from `deploy/docker/Dockerfile.connect` the first time the lab starts, and the Maven image is used only when you build the connector. The sizes above add up to about 11.7 GB if each is counted separately (layers that two images share are stored once). Keep more free space than that for the database and Kafka data. The first download was not timed in this path, so no download time is given.

### 3. Check the free disk space

{{cmd:disk}}
{{out:disk}}

### 4. Check that the lab's ports are free

{{cmd:ports}}
{{out:ports}}

The lab publishes four ports on `127.0.0.1` only (Sybase 5000, the Kafka web UI 8080, Kafka Connect 8083, Kafka 29092). Port 11752, where the connector listens for RepAgent, is not published at all: only the other containers reach it. If one of the first four says "in use", another program holds it and the lab cannot start (see the next lesson).

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- The time of a first download on a clean machine, and starting with too little disk space.
- Other operating systems.
