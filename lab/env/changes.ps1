# Insert, update and delete a few rows in the source database.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
Invoke-AseSql (Get-Content -Raw (Join-Path $LabEnvDir 'changes.sql')) -As app
