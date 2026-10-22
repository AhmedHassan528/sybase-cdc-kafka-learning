# Print the events of a topic with their keys. Usage: consume.ps1 [topic] [timeout-ms]
param([ValidatePattern("^[A-Za-z0-9._-]+$")][string]$TopicName, [int]$TimeoutMs = 8000)
. "$PSScriptRoot\_common.ps1"
if (-not $TopicName) { $TopicName = $Topic }
# The Kafka tool writes harmless warnings to stderr (for example while a topic does not exist yet). Windows PowerShell
# turns native stderr into an error record, so stop treating it as an error and drop it.
$ErrorActionPreference = 'Continue'
docker exec $Kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 `
  --topic $TopicName --from-beginning --timeout-ms $TimeoutMs `
  --property print.key=true --property 'key.separator= | ' 2>&1 | Where-Object { $_ -is [string] -or $_.GetType().Name -ne 'ErrorRecord' }
