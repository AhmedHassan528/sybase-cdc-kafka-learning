# Create the two least-privilege lab accounts in ASE (run by start.ps1; safe to run again):
#   cdc_admin  replication_role only: configure, start and stop the RepAgent. No table access, no DDL.
#   cdc_app    select/insert/update/delete on the sample tables only. No RepAgent administration.
# Passwords are generated into lab\env\.lab-secrets, which is git-ignored.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$new = $false
if (-not (Test-Path $LabSecrets)) {
  function New-LabPassword { 'Lab' + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })) + '9' }
  "CDC_ADMIN_PASSWORD=$(New-LabPassword)`nCDC_APP_PASSWORD=$(New-LabPassword)" | Set-Content -Path $LabSecrets -Encoding ascii
  . "$PSScriptRoot\_common.ps1"
  $new = $true
}
Invoke-AseSql @"
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
"@ | Out-Null
if ($new) {
  Invoke-AseSql "alter login cdc_admin modify password '$CDC_ADMIN_PASSWORD'`ngo`nalter login cdc_app modify password '$CDC_APP_PASSWORD'`ngo`n" | Out-Null
}
Write-Host 'ok: lab accounts cdc_admin (replication_role) and cdc_app (DML on sample tables) exist'
