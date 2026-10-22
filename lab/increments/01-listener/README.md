# Increment 1: the listener RepAgent connects to

**What this is.** One numbered step of the build-along. (The word "increment" has nothing to do with the JDBC connector's
"incremental" polling mode. This connector never runs a `SELECT`: ASE's RepAgent pushes the transaction log to it.)

**You build:** a TCP listener that plays the part of a Replication Server, so the real ASE RepAgent can log in and start
talking to it.

- `LtlServer` (`starter/src/main/java/com/phoenix/cdc/sybase/ltl/LtlServer.java`): `start()`, `acceptLoop()`, `close()`.
- `LtlSession` (same folder): `login()`, `tokenStream()`, `language()`: the handshake and the answers RepAgent expects.

**Given (you do not write them):** the TDS byte-level classes (`TdsChannel`, `TdsLogin`, `TdsTokens`), the `LtlListener`
interface, and `Increment1Main`, which prints what your code does. TDS is the binary protocol ASE speaks; encoding it is
not the lesson here.

## Work through the checkpoints

The tests in `tests/` replay packets captured from a real ASE RepAgent, so what passes here is what the real thing sends.

| Checkpoint | You make this work | TODO in the starter |
|-----------:|--------------------|---------------------|
| 1 | The captured login is accepted (LOGINACK status 5) | 4 |
| 2 | A wrong password is refused (status 6) | 4 |
| 3 | `connect source` reaches the listener and is answered with two result sets | 5, 6 |
| 4 | `get maintenance user` and `get truncation` are answered | 6 |
| 5 | An LTL batch reaches `onLtl()` and gets exactly one DONE | 6 |
| 6 | After `close()` nothing listens any more | 1, 2, 3 |

```bash
lab/increments/01-listener/verify.sh              # unit checkpoints on your starter (Maven runs in Docker)
lab/increments/01-listener/verify.sh solution     # the same tests against the reference solution
```

Start state: all 6 checkpoints fail with `UnsupportedOperationException`. Reference solution: all 6 pass.

## Live check against the real ASE

With the lab running (`lab/env/start.sh`, `lab/env/register-connector.sh`):

```bash
lab/increments/01-listener/verify-live.sh         # your working copy
```

It stops the connector, runs your listener in the Connect container, writes one row, and passes when the real RepAgent
logged in, connected its source and sent LTL to your code. Expected output (reference solution):

```
[inc1] listening on port 11752
[inc1] login user=rs_user accepted=true
[inc1] connect source MYSYBASE.phoenix_test LTL 760
[inc1] LTL 10434 bytes: distribute 1 ~*620261022 21:55:29:876,4 0x00000000000015b0...
PASS  01-listener (solution): the real RepAgent logged in, connected its source and sent LTL to your listener
```

The connector is resumed afterwards. Rows your listener saw are still delivered later by the connector.

## Stuck?

The reference solution is in `lab/solutions/01-listener/`. Compare it with your files, for example
`diff lab/increments/01-listener/starter/src lab/solutions/01-listener/src`.

## Not covered

TLS or encrypted passwords between RepAgent and the listener (the lab turns password encryption off) were not run.
These scripts are bash only; on Windows run them in Git Bash.
