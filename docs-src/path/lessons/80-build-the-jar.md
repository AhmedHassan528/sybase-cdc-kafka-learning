---
id: 8.1
stage: build-and-kafka
order: 1
title: Build the connector JAR
summary: Build the connector from its source with Maven in a container, and prove that the result contains exactly the classes of the JAR the lab runs.
objectives:
  - You can build the connector with one command that needs only Docker.
  - You can say what the build produces and where.
  - You can check a fresh build against the JAR the lab runs.
prerequisites: [7.22]
prereqCheck: build
noDiagramReason: The lesson runs one build and compares two class lists; the pieces of the build were explained in the pom.xml lesson (7.21).
---
## Description

Everything you read in stage 7 becomes one file, a JAR, with Maven. You do not need Java or Maven on your machine: the build runs in a container made from a pinned Maven image (the image and its digest are set in `lab/env/_common.sh`), with a Docker volume that caches the downloaded libraries, so only the first build downloads them.

`lab/path/build-connector.sh` runs exactly this, from the repository root:

```bash
docker run --rm -v <repository>/sybase-cdc-connector:/src -w /src <pinned maven image> mvn -B -q package
```

`mvn package` goes through the Maven phases in order: it compiles the 19 files for Java 17, **runs the unit tests** (the surefire plugin from the pom.xml lesson), and then the shade plugin writes the JAR to `sybase-cdc-connector/target/`. `-q` keeps Maven quiet, so the test report is not shown (evidence 38 shows the same tests, 11 of them, passing).

The script then does one more thing that Maven does not: it **compares the class files** of the new JAR with the class files of the JAR in `plugins/sybase-cdc/`, the one the lab's Connect container runs. It deliberately does **not** copy the new JAR into `plugins/`, so the running lab is not changed. (The script `sybase-cdc-connector/build.sh` is the one that copies it there.)

## Steps

### 1. Build, and compare with the JAR the lab runs

{{cmd:build}}
{{out:build}}

Read the output:

- The first line is the command, shortened.
- The three `SLF4J` lines are warnings from the unit tests, which run without a logging backend. They do not stop the build.
- `maven exit code: 0` and the time: the build succeeded in the recorded run (the time differs from run to run and between machines, so it is shown as a placeholder).
- `built: ...jar (65857 bytes)` is the new JAR.
- Both JARs contain **33 class files** (the 19 classes plus their nested classes, records and anonymous classes), and `ok: both JARs contain exactly the same class files`. The source in the repository is therefore the source of the code the lab runs. The comparison looks at which class files exist, not at their bytes: two builds of the same source can differ in timestamps.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Copying the new JAR into `plugins/sybase-cdc/` and restarting Kafka Connect so that it runs the new build. This is what `sybase-cdc-connector/build.sh` does; it was not run here because it would replace the JAR file of the repository.
- A build with a failing unit test, and a build without internet access (the first build downloads libraries).
- Building on other systems than Windows with Git Bash.
