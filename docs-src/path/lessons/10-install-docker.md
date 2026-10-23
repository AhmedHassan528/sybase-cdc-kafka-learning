---
id: 1.1
stage: environment
order: 1
title: Install and check Docker
summary: Check that Docker and Docker Compose are installed and that the Docker engine answers, because the whole lab runs in containers.
objectives:
  - You can say which Docker pieces the lab needs (the engine and Compose).
  - You can check that both are installed and that the engine is running.
prerequisites: []
noDiagramReason: The lesson only checks versions; no structure or flow is explained here.
---
## Description

The lab is four containers started by Docker Compose: the Sybase ASE database, Kafka, Kafka Connect with our connector, and a web UI for Kafka. You do not install Java, Maven, Kafka or Sybase on your machine. Maven even runs inside a container when you build the connector. All you need is Docker with the Compose plugin.

**Installing Docker.** On Windows the lab was run with Docker Desktop, which was already installed here, so the installation itself was *not run* for this path. Use the vendor's instructions: [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) and [Docker Engine on Linux](https://docs.docker.com/engine/install/). macOS and Linux were *not run* either.

**Git Bash.** All commands in this path are written for a Bash shell. On Windows run them in Git Bash; the lab's scripts also exist as PowerShell files (`.ps1`) for the main steps, but the path's checks are Bash only.

## Steps

### 1. Check the Docker client

{{cmd:version}}
{{out:version}}

The path was recorded with the versions shown above. Other versions were not tested. Write down yours.

### 2. Check Docker Compose

{{cmd:compose}}
{{out:compose}}

The lab uses `docker compose` (with a space, the plugin), not the older `docker-compose` command.

### 3. Check that the engine answers

{{cmd:engine}}
{{out:engine}}

This command talks to the engine, so it fails if Docker Desktop is not running. The numbers are what the engine can use: here 8 CPUs and about 7.6 GiB of memory. The lesson after this one says how much the lab needs.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Installing Docker itself (it was already installed).
- macOS and Linux.
- What the commands print when the Docker engine is not running (Docker Desktop was not stopped for this path).
