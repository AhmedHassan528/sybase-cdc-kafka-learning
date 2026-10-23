# Build a Sybase CDC connector from scratch

You will write, step by step, a connector that moves changes from SAP/Sybase ASE to Apache Kafka. At the end it runs
inside a real Kafka Connect worker and delivers a real change from a real ASE.

**What kind of connector is this?** It is log-based change data capture. It never runs a `SELECT` on your tables: ASE's
RepAgent reads the transaction log and pushes the changes to a listener, and building that listener is the first step.
(The word "increment" below only means "one numbered step". It is unrelated to the incremental polling mode of the JDBC
source connector.)

## Before you start

1. Docker, and nothing else for the build (Maven runs in a container). Basic Java.
2. The lab running: `lab/env/start.sh`, then `lab/env/register-connector.sh`. The article's "Try it at home" section walks
   through this and shows the events you are about to build the machinery for.
3. Recommended: read the article's first four sections (`docs/article.html`) so you know what the pipeline does. The
   build-along section (5) tells the same story as the steps below with real output.

## The path

Each step gives you a **starter** (compiles, but the new tests fail), **tests** that replay packets captured from a real
ASE RepAgent, a **live check** against the real ASE, and a **reference solution** to compare with.

| Step | You write | The real problem it solves | Folder |
|-----:|-----------|----------------------------|--------|
| 1 | the listener and the login/handshake | RepAgent can only talk to "a Replication Server"; you pretend to be one | [01-listener](01-listener/README.md) |
| 2 | the LTL value decoder and parser | the change stream is a compact text language, not rows | [02-ltl-parser](02-ltl-parser/README.md) |
| 3 | the transaction buffer | RepAgent sends changes before they commit; only committed ones are real | [03-transaction-buffer](03-transaction-buffer/README.md) |
| 4 | the event mapper | what a consumer reads: topic, key, `op`, `before`, `after`, `source` | [04-connect-records](04-connect-records/README.md) |
| 5 | the acknowledgement tracker | ASE may only free its log up to what Kafka really has | [05-acks-and-offsets](05-acks-and-offsets/README.md) |
| 6 | the Kafka Connect task and the plugin JAR | wire everything into a connector that Connect can load | [06-package-and-run](06-package-and-run/README.md) |

## How to work on a step

```bash
lab/increments/01-listener/verify.sh              # run the checkpoints on YOUR code (starter/ is your working copy)
# ...edit the TODOs in starter/src/main/java/..., run it again until every checkpoint passes...
lab/increments/01-listener/verify-live.sh         # then try your code against the real ASE
lab/increments/01-listener/verify.sh solution     # the reference solution passes the same tests, for comparison
```

- Read the TODO comments: each one says what to build and which checkpoint it makes pass. Start at checkpoint 1.
- Try before you peek. If you are stuck, read the reference solution in `lab/solutions/NN-name/`, then close it and write
  your own version.
- A step's starter begins from the reference solution of the previous step. To keep going with your own code, copy your
  finished classes over the next starter's files.
- The live checks stop the connector for a minute or two, run your code in its place, and put everything back. For step 6
  they run your plugin in a separate temporary worker instead and never modify the finished connector.

## If something goes wrong

The live-check scripts clean up after themselves, including when your code fails. If you interrupt one yourself (Ctrl+C),
these are the commands the scripts use to restore the lab; I did not test interrupting a run (*not run*):

```bash
curl -X PUT localhost:8083/connectors/sybase-cdc-phoenix/resume    # the connector was left stopped
docker rm -f cdc-lab-learner; docker start cdc-lab-connect          # step 6 was interrupted
```

If the lab itself is in a bad state, `lab/env/reset.sh` followed by `lab/env/start.sh` and
`lab/env/register-connector.sh` rebuilds it from nothing.

## What the checks prove, and what they do not

All six starters fail their checks and all six solutions pass them, both the unit checkpoints and the live checks against
the real ASE (`docs/evidence/35-increments-verify.txt`). The final solution is the finished connector in
`sybase-cdc-connector/`, apart from a few logging and helper differences (`docs/evidence/38-final-solution-comparison.txt`).

Not covered: running your plugin on OpenShift or IBM Event Streams, TLS or SASL, very large transactions, and how long
a learner needs. The step scripts are bash only; on Windows run them in Git Bash.
