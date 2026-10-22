# Create the second sample table (customer) and mark it for replication.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
Invoke-AseSql (Get-Content -Raw (Join-Path $LabEnvDir 'sample-data.sql'))
