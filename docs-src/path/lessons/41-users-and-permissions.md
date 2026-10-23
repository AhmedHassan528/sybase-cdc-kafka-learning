---
id: 4.2
stage: database
order: 2
title: Users and permissions
summary: See the three logins of the lab, what each may do, and prove it with one allowed and one denied command for each of the two least-privilege accounts.
objectives:
  - You can name the three logins and what each is for.
  - You can show that a least-privilege account is refused what it should not do.
prerequisites: [4.1]
prereqCheck: logins
noDiagramReason: The lesson lists three accounts and tests them; no flow needs a picture.
---
## Description

The lab uses three database logins on purpose:

| Login | What it may do | Used for |
|-------|----------------|----------|
| `sa` | everything | one-time setup only (creating the database, tables and the two accounts below). Its password is the **public default of the Sybase image**, not a secret of ours. |
| `cdc_admin` | only the `replication_role`: configure, start and stop RepAgent. **No access to the tables, no schema changes.** | the RepAgent lessons |
| `cdc_app` | `select`, `insert`, `update`, `delete` on the sample table `payment`. **No RepAgent administration.** | the demonstration (changing records) |

The passwords of the two lab accounts are generated when you start the lab and written to `lab/env/.lab-secrets`, a file that is **not** in git. The scripts read it; the lessons never show a password. This is the script that creates the accounts, run by `lab/env/start.sh`:

{{file:lab/env/create-accounts.sh}}

The `create login` lines make the logins, `grant role replication_role` gives `cdc_admin` its one role, `sp_adduser` adds both to the `phoenix_test` database, and the last `grant` gives `cdc_app` its four table rights. The `if not exists` lines make the script safe to run again.

## Steps

### 1. The logins

{{cmd:logins}}
{{out:logins}}

### 2. What `cdc_app` may do

{{cmd:app-ok}}
{{out:app-ok}}

`cdc_app` can read the table. This is the account the demonstration will use to insert, update and delete.

### 3. What `cdc_admin` may not do

{{cmd:admin-denied}}
{{out:admin-denied}}

`cdc_admin` has no rights on the table, and the database says so (the command itself exits normally; the refusal is in the message).

### 4. What `cdc_app` may not do

{{cmd:app-denied}}
{{out:app-denied}}

Looking at the RepAgent needs the `replication_role` (or `sa_role`), which `cdc_app` does not have. The listing is cut after four lines.

### 5. What `cdc_admin` may do

{{cmd:admin-ok}}
{{out:admin-ok}}

`cdc_admin` can ask the database about its RepAgent. The columns of this table are explained in stage 5; the numbers in the marker columns change all the time, so they are shown as placeholders.

## Troubleshooting

No failures were observed in the recorded runs.

## Not tested

- The full list of commands each account may or may not run (the lab's security check, `lab/env/verify-security.sh`, tests 78 of them; see evidence 21).
- Changing the passwords, or using the lab with the git-ignored secrets file deleted.
- TLS or encrypted logins (the lab uses the plain login; see the certificates lesson).
