# Return the lab to a clean state: removes all cdc-lab-* containers and their data.
# WARNING: deletes the lab ASE database and the Kafka topics.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
docker @Compose down --volumes --remove-orphans
Remove-Item -Force -ErrorAction SilentlyContinue $LabSecrets   # generated account passwords go with the containers
Write-Host 'Lab removed. Run lab\env\start.ps1 for a fresh environment.'
