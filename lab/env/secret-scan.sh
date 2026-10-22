#!/usr/bin/env bash
# Fail if a likely secret appears outside the labelled local test values.
# Allowed: rs_user/rs_password (connector login), myPassword (public image default sa password).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
pattern='(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|(password|secret|token|apikey|api_key)["'"'"' ]*[:=]["'"'"' ]*[A-Za-z0-9/+_.-]{8,})'
hits=$(grep -rInE "$pattern" --exclude-dir=.git --exclude-dir=target --exclude-dir=node_modules --exclude-dir=captures --exclude-dir=evidence \
        --exclude='*.tar.gz' --exclude='*.jar' --exclude='*.so' . | grep -vE 'rs_password|myPassword|password: password$|secret-scan\.sh|\{\{|changeit|<[a-z-]+>' )
if [ -n "$hits" ]; then echo "POSSIBLE SECRETS:"; echo "$hits"; exit 1; fi
echo "secret scan: no findings (allowed local test values: rs_user/rs_password, myPassword)"
