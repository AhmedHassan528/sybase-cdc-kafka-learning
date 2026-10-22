#!/usr/bin/env bash
# Create the two least-privilege lab accounts in ASE (run by start.sh; safe to run again):
#   cdc_admin  replication_role only: configure, start and stop the RepAgent. No table access, no DDL.
#   cdc_app    select/insert/update/delete on the sample tables only. No RepAgent administration.
# sa is used only for this and for one-time DDL (creating tables). Passwords are generated into
# lab/env/.lab-secrets, which is git-ignored. Evidence: docs/evidence/21-lab-accounts.txt.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

if [ ! -f "$LAB_SECRETS" ]; then
  gen() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20; }
  umask 077
  printf 'CDC_ADMIN_PASSWORD=Lab%s9\nCDC_APP_PASSWORD=Lab%s9\n' "$(gen)" "$(gen)" > "$LAB_SECRETS"
  new_secrets=1
fi
source "$LAB_SECRETS"

ase_sql >/dev/null <<SQL
use master
go
if not exists (select 1 from master..syslogins where name = 'cdc_admin')
  create login cdc_admin with password '$CDC_ADMIN_PASSWORD' default database phoenix_test
go
if not exists (select 1 from master..syslogins where name = 'cdc_app')
  create login cdc_app with password '$CDC_APP_PASSWORD' default database phoenix_test
go
grant role replication_role to cdc_admin
go
use phoenix_test
go
if user_id('cdc_admin') is null exec sp_adduser cdc_admin
go
if user_id('cdc_app') is null exec sp_adduser cdc_app
go
grant select, insert, update, delete on payment to cdc_app
go
SQL
if [ "${new_secrets:-}" = 1 ]; then
  # Secrets were regenerated but the logins already existed: set the new passwords.
  ase_sql >/dev/null <<SQL
alter login cdc_admin modify password '$CDC_ADMIN_PASSWORD'
go
alter login cdc_app modify password '$CDC_APP_PASSWORD'
go
SQL
fi
echo "ok: lab accounts cdc_admin (replication_role) and cdc_app (DML on sample tables) exist"
