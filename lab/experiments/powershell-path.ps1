# Runs the PowerShell versions of the lab scripts in the order of "Try it at home", from a clean lab, and prints the result.
# Use it to check that the .ps1 scripts work (the article's captured output comes from the .sh versions).
$ErrorActionPreference = 'Stop'
$env_ = Join-Path $PSScriptRoot '..\env'
function Step($t) { Write-Host ""; Write-Host "=== $t" }
$t0 = Get-Date
$failed = 0

Step 'reset.ps1';              & "$env_\reset.ps1"
Step 'start.ps1 (also creates the lab accounts)'; & "$env_\start.ps1"
Step 'register-connector.ps1'; & "$env_\register-connector.ps1" | Select-Object -Last 8
Step 'sample-data.ps1';        & "$env_\sample-data.ps1" | Select-Object -Last 3
Step 'changes.ps1';            & "$env_\changes.ps1"
Start-Sleep 12
Step 'consume.ps1 (payment)';  & "$env_\consume.ps1"
Step 'consume.ps1 rejects a bad topic name'
try { & "$env_\consume.ps1" -TopicName 'x$(id)'; Write-Host 'FAIL: accepted'; $failed++ } catch { Write-Host 'PASS: rejected' }
Step 'accounts: app may insert, admin may not'
"insert into customer (full_name, country) values ('PS1 app', 'EG')`ngo" | ForEach-Object { . "$env_\_common.ps1"; Invoke-AseSql $_ -As app }
. "$env_\_common.ps1"
$denied = Invoke-AseSql "insert into customer (full_name, country) values ('PS1 admin', 'EG')`ngo" -As admin | Out-String
if ($denied -match 'permission denied') { Write-Host 'PASS: cdc_admin is refused DML' } else { Write-Host 'FAIL: cdc_admin was not refused'; Write-Host $denied; $failed++ }
Write-Host ""; Write-Host ("total: {0:N0} s" -f ((Get-Date) - $t0).TotalSeconds)
if ($failed -gt 0) { Write-Host "RESULT: $failed check(s) failed"; exit 1 }
Write-Host "RESULT: all checks passed"
