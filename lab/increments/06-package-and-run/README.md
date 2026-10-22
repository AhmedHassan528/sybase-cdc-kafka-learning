# Increment 6: the connector, packaged and running

**You build:** the Kafka Connect task, `SybaseCdcSourceTask`, which ties every earlier increment together, and you package
the result as a plugin that a real Kafka Connect worker can load.

- `SybaseCdcSourceTask` (`starter/src/main/java/com/phoenix/cdc/sybase/connect/SybaseCdcSourceTask.java`): `start()`,
  `poll()`, `commitRecord()`, `stop()` and the six methods of the inner `Listener`.

**Given:** `SybaseCdcSourceConnector` (always exactly one task: RepAgent connects to one host and port per database),
the build setup that packages one self-contained JAR (the Maven shade plugin; the Kafka Connect API and slf4j are
provided by the Connect runtime and are not packaged), and everything from increments 1 to 5.

How it fits together:

```
RepAgent --LTL--> listener thread --> TransactionBuffer --COMMIT--> queue --poll()--> Kafka
    ^                                                                                  |
    +------ "get truncation" <-- AckTracker.acked() <-- commitRecord() <-- ack -------+
```

## Work through the checkpoints

51 tests: the 42 of increments 1 to 5 and 9 new ones that drive your task with a fake RepAgent and a fake Kafka Connect
context (no Docker or Kafka needed):

| Checkpoint | You make this work |
|-----------:|--------------------|
| 1 | `start()` opens the listener, `stop()` closes it |
| 2 | the login is checked against the configured user and password |
| 3 | a source for another database is refused |
| 4 | a committed transaction becomes records (topic, key, value) |
| 5 | the last record of a transaction carries its commit position as the offset |
| 6 | the truncation point only advances when Kafka confirms the record |
| 7 | a stored position is where we start from |
| 8 | transactions already published are skipped when RepAgent sends them again |
| 9 | tables not on the include list give no records, but the commit still moves the position |

```bash
lab/increments/06-package-and-run/verify.sh            # unit checkpoints on your starter
lab/increments/06-package-and-run/verify.sh solution
```

Start state: the 9 new tests fail. Reference solution: all 51 pass.

## Live check: your plugin in a real Connect worker

```bash
lab/increments/06-package-and-run/verify-live.sh
```

It builds your JAR, **stops the finished connector's container** and starts a temporary worker that has only your plugin.
The worker uses its own internal topics (`_lab6-*`) and writes events to topics starting `lab6.`, so nothing mixes with
the finished connector's `sybase.*` topics. It checks that Connect lists your connector class, registers it, writes a row
and waits for its event in Kafka. Afterwards it deletes the temporary worker and topics and starts the finished connector
again. Rows written during the check go to `lab6.*` only. Expected (reference solution, shortened):

```
ok: Connect lists your connector class (the plugin JAR is packaged correctly)
ok: your task is RUNNING
event on lab6.phoenix_test.payment: {"payment_id":"22"} | {"op":"c","before":null,"after":{"payment_id":"22","account_no":"LAB6014353-1",...
PASS  06-package-and-run (solution): your packaged connector delivered the real change (LAB6014353-1) to Kafka
```

If your task fails to start, the check prints the task's error trace.

## Stuck?

`lab/solutions/06-package-and-run/`. The final solution is the finished connector in `sybase-cdc-connector/`, except for
three files in the `ltl` package (the listener interface, `LtlServer.localPort()` and a shorter `LtlSession`) and the
diagnostic `tools` folder.

## Not covered

Running the learner's plugin on OpenShift or IBM Event Streams, TLS/SASL, and large transactions were not run. Bash only;
on Windows use Git Bash.
