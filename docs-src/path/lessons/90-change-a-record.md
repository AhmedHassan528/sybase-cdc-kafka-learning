---
id: 9.1
stage: demo
order: 1
title: Change a record
summary: Insert, update and delete one row of the payment table as the application account, the three changes the pipeline will carry to Kafka.
objectives:
  - You can make the three changes with one script and say what each statement does.
  - You can repeat the demonstration with a new tag without confusing the check.
prerequisites: [8.3]
prereqCheck: change
noDiagramReason: The lesson runs three SQL statements; the pipeline that carries them is drawn in lessons 6.3 and 9.3.
---
## Description

This is the last stage and the point of everything before it: change a row in the database and see the change arrive in Kafka. The script `lab/path/demo/change-records.sh` makes three changes to one row of `payment`, each as its own transaction, as the application account `cdc_app` (lesson 4.2):

{{file:lab/path/demo/change-records.sh}}

1. an **insert** of a row with the account number `PATH-DEMO`, amount 10.00 and currency EUR;
2. an **update** that changes the amount to 25.50;
3. a **delete** of the row.

The account number is a **tag**: it is how the check in the next lesson recognises *these* events among all the others in the topic. The script takes the tag as its first argument; the default is `PATH-DEMO`. To repeat the demonstration, run it with another tag (letters, digits and `-`, at most 30 characters):

```bash
bash lab/path/demo/change-records.sh MY-TEST
```

The check in lesson 9.2 takes the same tag. Running with the same tag twice would put six events with that tag in the topic, and the check would fail on purpose.

## Steps

### 1. Make the three changes

{{cmd:change}}
{{out:change}}

Each `>` line is the statement that was sent and `(1 row affected)` is the database's answer. Nothing here talks to Kafka. The database wrote the three transactions to its log, and RepAgent, which is waiting for changes (lesson 6.2), reads them from there and sends them to the connector.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- Running the script twice with the same tag (the second run's events would be recognised by the check as a mismatch; this was not run).
- Changes to other tables, and larger transactions: see the build-along experiments (evidence 24, 18).
- Running the script as another account.
