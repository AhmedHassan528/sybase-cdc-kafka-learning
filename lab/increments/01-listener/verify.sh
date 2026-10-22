#!/usr/bin/env bash
# Run the unit checkpoints of increment 01. Usage: verify.sh [starter|solution]   (default starter = your working copy)
# Bash only; on Windows run it in Git Bash. Needs Docker (Maven runs in a container).
exec "$(dirname "${BASH_SOURCE[0]}")/../../env/verify-increment.sh" 01-listener "${1:-starter}"
