# Register the connector and start the RepAgent so ASE streams changes to it.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

try { Invoke-WebRequest -UseBasicParsing "$ConnectUrl/connectors/$ConnectorName" | Out-Null; Write-Host "connector $ConnectorName already registered" }
catch {
  Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -InFile (Join-Path $LabRoot 'connectors\sybase-cdc-phoenix.json') "$ConnectUrl/connectors" | Out-Null
  Write-Host "registered $ConnectorName"
}
Wait-For 'connector task RUNNING' 60 { (Invoke-RestMethod "$ConnectUrl/connectors/$ConnectorName/status").tasks[0].state -eq 'RUNNING' }
# The RepAgent must start only after the connector listens (first time only; later boots auto-start).
Invoke-AseSql "sp_config_rep_agent phoenix_test, 'retry timeout', '10'`ngo`nsp_start_rep_agent phoenix_test`ngo" -As admin
Invoke-RestMethod "$ConnectUrl/connectors/$ConnectorName/status" | ConvertTo-Json -Depth 5
