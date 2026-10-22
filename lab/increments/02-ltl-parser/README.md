# Increment 2: reading LTL

**You build:** the code that turns the LTL text RepAgent sends into commands your program can use: `BEGIN`, `INSERT`,
`UPDATE`, `DELETE`, `COMMIT`, `ROLLBACK`, each with its table, its values and its position in the log.

- `LtlValues` (`starter/src/main/java/com/phoenix/cdc/sybase/ltl/LtlValues.java`): one value token to one Java value.
- `LtlParser` (same folder): the grammar: tags, begin/commit/rollback, `applied ... rs_insert|rs_update|rs_delete`.

**Given:** `LtlLexer` (the tokenizer; its class comment explains the odd number-and-marker encoding of LTL),
`LtlCommand` (the record you produce), and from increment 1 your listener, now handing over parsed commands
(`onCommands` replaces `onLtl`). `Increment2Main` prints the commands.

## Work through the checkpoints

21 tests: the 6 of increment 1 (they must keep passing) and 15 new ones.

| Tests | You make this work | TODO |
|------:|--------------------|------|
| `valuesCheckpoint1..6` | integers, text, binary, exact decimals, floats, dates and times | 1 to 5 |
| `parserCheckpoint1..7` | real captured messages: every datatype, update merge, delete, rollback, multi-row order, long values | 6 to 8 |
| server `checkpoint5, 7, 8` | the session (given) parses before handing over, and closes the connection on unparsable LTL; these pass once your parser works | none |

Rules worth knowing (the lab's evidence 15 shows them in real events): exact decimals and money stay strings so no
precision is lost; `float`/`real` become numbers; dates become ISO text; an update's `after` image is rebuilt from the
before image plus the changed columns.

```bash
lab/increments/02-ltl-parser/verify.sh            # unit checkpoints on your starter
lab/increments/02-ltl-parser/verify.sh solution
```

Start state: 16 of 21 fail. Reference solution: all 21 pass.

## Live check against the real ASE

```bash
lab/increments/02-ltl-parser/verify-live.sh
```

It writes a row with a known account number and passes when your parser prints an `INSERT payment` for exactly that
account, with the other columns decoded. Expected output line (reference solution):

```
[inc2] INSERT payment before=null after={payment_id=11, account_no=LIVE011706-1, amount=1, currency=EUR, created_at=2026-10-22T22:17:18.563}
PASS  02-ltl-parser (solution): your parser decoded the row we just wrote (account_no=LIVE011706-1) from the real RepAgent's LTL
```

## Stuck?

`lab/solutions/02-ltl-parser/` has the reference solution.

## Not covered

Character sets other than the default, `text`/`image` columns and very large values were not run (see the article's data
types section). Bash only; on Windows use Git Bash.
