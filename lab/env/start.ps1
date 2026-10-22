# Start the lab: ASE, Kafka, Kafka Connect, Kafka UI. Safe to run again.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

docker @Compose up -d --build
Wait-For 'ASE finished first-boot init (READY)' 900 { (docker logs $Ase 2>&1 | Out-String) -match '=== READY' }
Wait-For 'Kafka healthy' 120 { docker exec $Kafka /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server kafka:9092 | Out-Null; $LASTEXITCODE -eq 0 }
Wait-For 'Kafka Connect REST answers' 120 { (Invoke-WebRequest -UseBasicParsing "$ConnectUrl/connectors").StatusCode -eq 200 }
& "$PSScriptRoot\create-accounts.ps1"
Write-Host 'Lab is up. Next: lab\env\register-connector.ps1, then lab\env\changes.ps1'
