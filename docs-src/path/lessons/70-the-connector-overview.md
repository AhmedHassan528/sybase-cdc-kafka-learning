---
id: 7.1
stage: java
order: 1
title: The connector at a glance
summary: See the whole connector before you read its files, its four packages and the order in which the next lessons take them, and how the build-along exercises map onto them.
objectives:
  - You can name the four packages of the connector and what each is for.
  - You can say in which order the next lessons read the files, and why.
  - You can find the exercise (starter and tests) for the classes that have one.
prerequisites: [6.3]
prereqCheck: classes
diagrams: [class-relationships]
---
## Description

You have run the connector for six stages; now you read it. The code in the next 20 lessons is the **finished connector in `sybase-cdc-connector/`**, the module whose JAR the lab runs (lesson 8.1 proves that a fresh build contains exactly the same classes as the running JAR). The build-along's reference solution (`lab/solutions/06-package-and-run`) is the same code except for the comments of three files (`LtlListener`, `LtlServer` and `LtlSession`) and one extra tool class, `LtlProbe` (evidence 38 lists the differences).

The connector has **19 Java classes in four packages**, plus its `pom.xml`:

| Package | What it does | Classes |
|---------|--------------|---------|
| `tds` | The wire: cuts a socket into TDS packets, reads RepAgent's login, builds the answers. | `TdsChannel`, `TdsLogin`, `TdsTokens` |
| `ltl` | The Log Transfer Language and the conversation: tokenise and parse LTL, convert its values, run one RepAgent session, listen for connections. | `LtlCommand`, `LtlLexer`, `LtlValues`, `LtlParser`, `LtlListener`, `LtlSession`, `LtlServer` |
| `cdc` | The transaction logic: positions in the log, grouping rows until commit, safe positions after Kafka acknowledgements. | `Oqid`, `CommittedTransaction`, `TransactionBuffer`, `AckTracker` |
| `connect` | The part Kafka Connect sees: settings, the event format, the connector and the task. | `ChangeEventMapper`, `SybaseCdcConfig`, `SybaseCdcSourceTask`, `SybaseCdcSourceConnector` |
| `tools` | A stand-alone discovery tool, not used by the running connector. | `LtlProbe` |

{{diagram:class-relationships}}

The arrows only go downwards: `connect` uses `cdc` and `ltl`, `ltl` uses `tds`, and `tds` uses nothing of the connector. That is the **reading order** of the next lessons: first the wire (`tds`), then the language and the conversation (`ltl`), then the transaction logic (`cdc`), and last the Kafka Connect classes that tie it all together (`connect`), so that each file is explained after the files it uses. Inside a package the classes a file depends on come first. The tool and the build file come at the end, and lesson 7.22 follows one change through all of them.

**Every lesson has the same shape.** The purpose of the file, how it fits (what it uses and what uses it), the code exactly as it is in the repository with numbered markers in the margin, a note for every class and every method, notes on the important lines, the design decisions, and the environment-dependent values of the file with what to change elsewhere. All of those values are also in one table, [the values table](../env-values.html).

**Writing it yourself.** The build-along guide has an exercise for the classes below: a starter that compiles but fails its tests, the tests, and a reference solution. Each Java lesson that has an exercise links to it; this path does not require you to do them.

| Increment | You write | Exercise |
|-----------|-----------|----------|
| 1 | `LtlServer`, `LtlSession` | [the listener](../../guide/01-listener.html) |
| 2 | `LtlParser`, `LtlValues` | [the LTL parser](../../guide/02-ltl-parser.html) |
| 3 | `TransactionBuffer` | [the transaction buffer](../../guide/03-transaction-buffer.html) |
| 4 | `ChangeEventMapper` | [the event mapper](../../guide/04-connect-records.html) |
| 5 | `AckTracker` | [acknowledgements and offsets](../../guide/05-acks-and-offsets.html) |
| 6 | `SybaseCdcSourceTask` | [package and run](../../guide/06-package-and-run.html) |

## Steps

### 1. The classes inside the running JAR

{{cmd:classes}}
{{out:classes}}

The 19 classes of the table, as the JAR the lab runs contains them (nested classes and records are left out of this list; every one of them is explained in its file's lesson).

### 2. How much code is it?

{{cmd:lines}}
{{out:lines}}

About 1,850 lines of Java in total, in the 19 files, comments included.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Writing the classes yourself; the exercises of the build-along were run in the lab's earlier verification (evidence 35), not in this lesson.
- Building a different version of the connector from these files (lesson 8.1 builds this one).
