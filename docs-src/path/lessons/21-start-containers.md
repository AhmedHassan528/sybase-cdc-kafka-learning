---
id: 2.2
stage: launch
order: 2
title: Start the containers
summary: Start the whole lab with one script, see what it waits for, and check that the four containers are running.
objectives:
  - You can start the lab and say what the start script waits for.
  - You can see the running containers and their published ports.
prerequisites: [2.1]
prereqCheck: containers
noDiagramReason: The lesson runs one script and lists the result; the architecture was drawn in the previous lesson.
---
## Description

`lab/env/start.sh` does four things in order:

1. `docker compose up -d --build` creates and starts the four containers, building the connector image locally from `deploy/docker/Dockerfile.connect` (it copies the connector JAR into a Kafka Connect image).
2. It waits until the database has finished its **first-boot setup** (the line `=== READY` in the database container's log).
3. It waits until Kafka answers and until the Kafka Connect REST API answers.
4. It runs `lab/env/create-accounts.sh`, which creates the two lab logins you will meet in stage 4.

Running it twice is safe. On the very first start Docker also downloads the images and the database creates its database from the scripts in `sybase/`; that first start takes longer than the one recorded here, and it was not timed.

The command below has `COMPOSE_PROGRESS=quiet` in front. That only keeps Docker's build log out of the output; without it you see the same steps with a long log.

## Steps

### 1. What a port clash looks like

Before starting, here is the most likely thing to go wrong: a program on your machine already holds one of the lab's ports. This step shows Docker's message for it, using two throwaway containers on a spare port (18083), so the lab is not touched.

{{cmd:port-busy}}
{{out:port-busy}}

The second container cannot publish the port the first one holds. If one of the lab's own ports (5000, 8080, 8083 or 29092) is taken, its container fails to start the same way. The fix is to stop whatever holds the port. The recorded demonstration used a spare port, not one of the lab's four, and a clash on a lab port was not reproduced.

### 2. Start the lab

{{cmd:start}}
{{out:start}}

Each `ok:` line is a wait that finished. The recorded run was against images that were already built and pulled, on a lab that was reset first.

### 3. See the running containers

{{cmd:containers}}
{{out:containers}}

You should see the four containers from the previous lesson, each with its published port. The connector is **not** registered yet; the lab is up and waiting for it, and you register it in stage 6.

## Troubleshooting

- **Symptom**: Docker says `Bind for 127.0.0.1:<port> failed: port is already allocated` when a container starts. **Cause**: another program or container already holds that port on your machine. **Fix**: stop the program that holds it (the port check of lesson 1.2 shows which lab ports are taken) and start again. **Seen in**: port-busy

## Not tested

- The very first start with images that still have to be downloaded, and its duration.
- Starting with too little disk space or memory.
- Docker Desktop not running when the script starts.
