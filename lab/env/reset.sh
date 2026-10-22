#!/usr/bin/env bash
# Return the lab to a clean state: removes all containers and their data, then you can run start.sh again.
# WARNING: deletes the lab ASE database and the Kafka topics (only the cdc-lab-* containers).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
"${COMPOSE[@]}" down --volumes --remove-orphans
rm -f "$LAB_SECRETS"                 # the generated account passwords go with the containers
echo "Lab removed. Run lab/env/start.sh for a fresh environment."
